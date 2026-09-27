import * as THREE from '../vendor/three.module.js?v=20260927e';

export class CoinRenderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080b12);
    this.scene.fog = new THREE.Fog(0x080b12, 20, 55);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    this.camera.position.set(14, 13, 18);
    this.camera.lookAt(0, 2.5, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(new THREE.HemisphereLight(0xdce7ff, 0x18243a, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(4, 14, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.sun = sun;
    this.scene.add(sun);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x162034, roughness: 0.82, metalness: 0.05 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.6, 16), floorMat);
    floor.position.y = -0.3;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(16, 16, 0x38516e, 0x223149);
    grid.position.y = 0.006;
    this.scene.add(grid);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x263652, transparent: true, opacity: 0.45, roughness: 0.7 });
    for (const [x, y, z, sx, sy, sz] of [
      [-8.15, 2.2, 0, 0.3, 4.4, 16], [8.15, 2.2, 0, 0.3, 4.4, 16],
      [0, 2.2, -8.15, 16, 4.4, 0.3], [0, 2.2, 8.15, 16, 4.4, 0.3],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), railMat);
      wall.position.set(x, y, z);
      this.scene.add(wall);
    }
    this.pusher = new THREE.Mesh(new THREE.BoxGeometry(12, 0.7, 1.2), new THREE.MeshStandardMaterial({ color: 0x355d91 }));
    this.pusher.position.set(0, 0.35, -5);
    this.pusher.visible = false;
    this.scene.add(this.pusher);

    // These temporaries are reused for every instance; the hot loop allocates no Three.js objects.
    this.position = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.matrix = new THREE.Matrix4();
    this.mesh = null;
    this.clock = 0;
    this.resize = this.resize.bind(this);
    addEventListener('resize', this.resize);
    this.resize();
  }

  rebuild(count, radius, thickness) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 24, 1, false);
    const material = new THREE.MeshStandardMaterial({ color: 0xd6a843, metalness: 0.72, roughness: 0.26 });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  sync(transforms, count) {
    if (!this.mesh) return;
    for (let i = 0, o = 0; i < count; i++, o += 8) {
      this.position.set(transforms[o], transforms[o + 1], transforms[o + 2]);
      this.quaternion.set(transforms[o + 4], transforms[o + 5], transforms[o + 6], transforms[o + 7]);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setOptions(options) {
    if (this.mesh) {
      this.mesh.visible = options.renderCoins;
      this.mesh.material.wireframe = options.wireframe;
      this.mesh.castShadow = options.shadows;
      this.mesh.receiveShadow = options.shadows;
    }
    this.renderer.shadowMap.enabled = options.shadows;
    this.sun.castShadow = options.shadows;
    this.pusher.visible = options.pusher;
    const ratio = options.pixelRatio === 'device' ? Math.min(devicePixelRatio, 1.5) : Number(options.pixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.resize();
  }

  animatePusher(dt, enabled) {
    if (!enabled) return;
    this.clock += dt;
    this.pusher.position.z = -4.7 + 1.4 * Math.sin(this.clock * 0.8);
  }

  render() { this.renderer.render(this.scene, this.camera); }

  resize() {
    const width = innerWidth;
    const height = innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose() { removeEventListener('resize', this.resize); }
}




