use khal::backend::GpuTimestamps;
use nexus3d::prelude::{
    NexusCapacities, NexusPipeline, NexusPipelineMask, NexusState, RbdCoupling,
};
use nexus_viewer3d::{DemoKind, NexusViewer};
use rapier3d::prelude::*;
use web_time::Instant;

const COIN_COUNTS: [usize; 4] = [1_000, 2_000, 5_000, 10_000];
const INITIAL_SCENE: usize = 3;
const COIN_RADIUS: f32 = 0.50;
const COIN_HALF_HEIGHT: f32 = 0.05;
const GRID_SIDE: usize = 100;
const GRID_SPACING: f32 = 1.065;
const LAYER_SPACING: f32 = 0.12;
const ARENA_HALF_EXTENT: f32 = 54.5;

#[derive(Default)]
struct FrameMeter {
    last: Option<Instant>,
    smoothed_ms: f64,
    frames: u64,
}

impl FrameMeter {
    fn tick(&mut self) -> (f64, f64) {
        let now = Instant::now();
        if let Some(last) = self.last.replace(now) {
            let ms = (now - last).as_secs_f64() * 1000.0;
            self.smoothed_ms = if self.frames == 0 { ms } else { self.smoothed_ms * 0.92 + ms * 0.08 };
            self.frames += 1;
        } else {
            self.last = Some(now);
        }
        let fps = if self.smoothed_ms > 0.0 { 1000.0 / self.smoothed_ms } else { 0.0 };
        (fps, self.smoothed_ms)
    }
}

fn seeded_unit(index: u32, salt: u32) -> f32 {
    let mut x = index.wrapping_add(salt).wrapping_mul(0x9E37_79B9);
    x ^= x >> 16;
    x = x.wrapping_mul(0x85EB_CA6B);
    x ^= x >> 13;
    (x as f32) / (u32::MAX as f32)
}

fn insert_fixed_box(state: &mut NexusState, viewer: &mut NexusViewer, position: Vec3, half_extents: Vec3) {
    let body = RigidBodyBuilder::fixed().build();
    let collider = ColliderBuilder::cuboid(half_extents.x, half_extents.y, half_extents.z)
        .translation(position).friction(0.55).build();
    let shape = collider.shared_shape().clone();
    let handle = state.insert_rigid_body(body, collider, RbdCoupling::None);
    viewer.insert_shape_with_color(
        handle, &shape, Pose::from_translation(position), Vec4::new(0.15, 0.22, 0.27, 1.0),
    );
}

async fn run_coin_scene(
    viewer: &mut NexusViewer,
    pipeline: &mut NexusPipeline,
    coin_count: usize,
) -> anyhow::Result<()> {
    let collision_capacity = (coin_count as u32 * 64).max(100_000);
    let capacities = NexusCapacities::default()
        .rbd_bodies(coin_count as u32 + 8)
        .rbd_collisions(collision_capacity);
    let mut state = NexusState::new(capacities);

    insert_fixed_box(&mut state, viewer, Vec3::new(0.0, -0.55, 0.0), Vec3::new(ARENA_HALF_EXTENT, 0.5, ARENA_HALF_EXTENT));
    let wall_height = 4.0;
    insert_fixed_box(&mut state, viewer, Vec3::new(ARENA_HALF_EXTENT, wall_height, 0.0), Vec3::new(0.5, wall_height, ARENA_HALF_EXTENT));
    insert_fixed_box(&mut state, viewer, Vec3::new(-ARENA_HALF_EXTENT, wall_height, 0.0), Vec3::new(0.5, wall_height, ARENA_HALF_EXTENT));
    insert_fixed_box(&mut state, viewer, Vec3::new(0.0, wall_height, ARENA_HALF_EXTENT), Vec3::new(ARENA_HALF_EXTENT, wall_height, 0.5));
    insert_fixed_box(&mut state, viewer, Vec3::new(0.0, wall_height, -ARENA_HALF_EXTENT), Vec3::new(ARENA_HALF_EXTENT, wall_height, 0.5));

    // One shared analytic cylinder drives all colliders and one instanced render batch.
    let coin_shape = SharedShape::cylinder(COIN_HALF_HEIGHT, COIN_RADIUS);
    let coin_color = Vec4::new(0.92, 0.64, 0.10, 1.0);
    let half_grid = (GRID_SIDE as f32 - 1.0) * 0.5;
    for index in 0..coin_count {
        let cell = index % (GRID_SIDE * GRID_SIDE);
        let layer = index / (GRID_SIDE * GRID_SIDE);
        let gx = (cell % GRID_SIDE) as f32 - half_grid;
        let gz = (cell / GRID_SIDE) as f32 - half_grid;
        let jitter_x = (seeded_unit(index as u32, 17) - 0.5) * 0.008;
        let jitter_z = (seeded_unit(index as u32, 91) - 0.5) * 0.008;
        let yaw = seeded_unit(index as u32, 313) * std::f32::consts::TAU;
        let position = Vec3::new(
            gx * GRID_SPACING + jitter_x,
            COIN_HALF_HEIGHT + 0.03 + layer as f32 * LAYER_SPACING + seeded_unit(index as u32, 701) * 0.35,
            gz * GRID_SPACING + jitter_z,
        );
        let body = RigidBodyBuilder::dynamic()
            .translation(position)
            .rotation(Vec3::new(0.0, yaw, 0.0))
            .linvel(Vec3::new((seeded_unit(index as u32, 811) - 0.5) * 0.30, 0.0, (seeded_unit(index as u32, 997) - 0.5) * 0.30))
            .locked_axes(LockedAxes::ROTATION_LOCKED_X | LockedAxes::ROTATION_LOCKED_Z)
            .linear_damping(0.04)
            .angular_damping(0.12)
            .build();
        let collider = ColliderBuilder::new(coin_shape.clone())
            .density(1.0).friction(0.55).restitution(0.02).build();
        let handle = state.insert_rigid_body(body, collider, RbdCoupling::None);
        viewer.insert_shape_with_color(handle, &coin_shape, Pose::IDENTITY, coin_color);
    }

    viewer.scene3d_mut().add_directional_light(Vec3::new(-1.0, -2.0, -0.7));
    let mut sim_params = nexus3d::rbd::shaders::dynamics::RbdSimParams::tgs_soft();
    sim_params.dt = 1.0 / 60.0;
    sim_params.num_solver_iterations = 1;
    state.set_rbd_sim_params(0, sim_params);
    state.finalize(viewer.backend()).await?;
    state.set_rbd_gravity(viewer.backend(), [0.0, -9.81, 0.0]);
    state.set_rbd_steps_per_frame(1);

    let mut timestamps = GpuTimestamps::new(viewer.backend(), 2048);
    let mut meter = FrameMeter::default();
    while viewer.render_frame().await {
        if viewer.simulating() {
            pipeline.simulate(viewer.backend(), &mut state, Some(&mut timestamps)).await?;
        }
        viewer.sync(&mut state, Some(&mut timestamps)).await?;

        let (fps, frame_ms) = meter.tick();
        let gpu_ms = viewer.ui.run_stats.gpu_total_time_ms;
        let encoding_ms = viewer.ui.run_stats.encoding_time_ms();
        publish_web_metrics(coin_count, fps, frame_ms, gpu_ms, encoding_ms);
        viewer.draw_custom_ui(move |ctx| {
            kiss3d::egui::Window::new("Nexus Coin Benchmark")
                .anchor(kiss3d::egui::Align2::RIGHT_TOP, [-12.0, 12.0])
                .resizable(false)
                .show(ctx, |ui| {
                    ui.heading(format!("{coin_count} analytic cylinders"));
                    ui.label("Seeded single-layer mix");
                    ui.monospace(format!("FPS          {fps:7.1}"));
                    ui.monospace(format!("Frame        {frame_ms:7.2} ms"));
                    ui.monospace(format!("GPU physics  {gpu_ms:7.2} ms"));
                    ui.monospace(format!("CPU encode   {encoding_ms:7.2} ms"));
                    ui.separator();
                    ui.label("WebGPU / Nexus 0.5.0 / 1 physics step per frame");
                    ui.label("X/Z tilt locked; Y rotation remains dynamic");
                });
        });
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
fn publish_web_metrics(coin_count: usize, fps: f64, frame_ms: f64, gpu_ms: f64, encoding_ms: f32) {
    let Some(window) = web_sys::window() else { return };
    let Some(document) = window.document() else { return };
    let Some(element) = document.get_element_by_id("telemetry") else { return };
    let _ = element.set_attribute("data-coins", &coin_count.to_string());
    let _ = element.set_attribute("data-fps", &format!("{fps:.3}"));
    let _ = element.set_attribute("data-frame-ms", &format!("{frame_ms:.3}"));
    let _ = element.set_attribute("data-gpu-ms", &format!("{gpu_ms:.3}"));
    let _ = element.set_attribute("data-encoding-ms", &format!("{encoding_ms:.3}"));
}

#[cfg(not(target_arch = "wasm32"))]
fn publish_web_metrics(_: usize, _: f64, _: f64, _: f64, _: f32) {}
#[kiss3d::main]
pub async fn main() {
    env_logger::init();
    let demos = COIN_COUNTS.iter().map(|count| (format!("{count} coins"), DemoKind::Rbd)).collect();
    let mut viewer = NexusViewer::new(demos).await.with_selected_demo(INITIAL_SCENE).with_running();
    viewer.set_camera(Vec3::new(-92.0, 68.0, -92.0), Vec3::new(0.0, 0.0, 0.0));
    viewer.init_backend();
    if !viewer.gpu_available() { return; }

    viewer.show_compile_banner().await;
    let mut pipeline = NexusPipeline::default();
    if let Err(error) = pipeline.preload_pipelines(viewer.backend(), NexusPipelineMask::RBD) {
        eprintln!("Nexus pipeline compilation failed: {error:?}");
        return;
    }

    loop {
        let selected = viewer.selected_demo().min(COIN_COUNTS.len() - 1);
        if let Err(error) = run_coin_scene(&mut viewer, &mut pipeline, COIN_COUNTS[selected]).await {
            eprintln!("Nexus coin scene failed: {error:?}");
            break;
        }
        if viewer.quitting() { break; }
        viewer.clear_scene();
        viewer.clear_transition();
    }
}




