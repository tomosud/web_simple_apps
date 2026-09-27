#include <box3d/box3d.h>
#include <emscripten/emscripten.h>
#include <math.h>
#include <stdint.h>
#include <stdlib.h>

#define MAX_COINS 10000
#define TRANSFORM_STRIDE 8

static b3WorldId g_world;
static b3BodyId* g_coins;
static float* g_transforms;
static float g_stats[4];
static int g_coin_count;
static int g_paused;
static int g_recycle;
static int g_pusher_enabled;
static float g_time;
static float g_radius;
static float g_thickness;
static b3BodyId g_pusher;
static uint32_t g_rng;

static float random01(void)
{
	g_rng ^= g_rng << 13;
	g_rng ^= g_rng >> 17;
	g_rng ^= g_rng << 5;
	return (float)(g_rng & 0x00FFFFFFu) / 16777216.0f;
}

static void create_box(float x, float y, float z, float hx, float hy, float hz)
{
	b3BodyDef body_def = b3DefaultBodyDef();
	body_def.position = (b3Pos){x, y, z};
	b3BodyId body = b3CreateBody(g_world, &body_def);
	b3ShapeDef shape_def = b3DefaultShapeDef();
	shape_def.baseMaterial.friction = 0.6f;
	b3BoxHull box = b3MakeBoxHull(hx, hy, hz);
	b3CreateHullShape(body, &shape_def, &box.base);
}

EMSCRIPTEN_KEEPALIVE int init_world(void)
{
	return 1;
}

EMSCRIPTEN_KEEPALIVE void destroy_world(void)
{
	if (b3World_IsValid(g_world))
	{
		b3DestroyWorld(g_world);
	}
	free(g_coins);
	free(g_transforms);
	g_coins = NULL;
	g_transforms = NULL;
	g_coin_count = 0;
	g_world = (b3WorldId){0};
}

EMSCRIPTEN_KEEPALIVE int reset_world(int coin_count, float gravity, float friction, float restitution,
	float radius, float thickness, int segments, int spawn_mode, int pusher_enabled, int recycle, int seed)
{
	destroy_world();
	if (coin_count < 1 || coin_count > MAX_COINS || segments < 8 || segments > 24)
	{
		return 0;
	}

	g_coin_count = coin_count;
	g_radius = radius;
	g_thickness = thickness;
	g_recycle = recycle;
	g_pusher_enabled = pusher_enabled;
	g_rng = seed == 0 ? 1u : (uint32_t)seed;
	g_time = 0.0f;
	g_paused = 0;
	g_coins = (b3BodyId*)malloc((size_t)coin_count * sizeof(b3BodyId));
	g_transforms = (float*)malloc((size_t)coin_count * TRANSFORM_STRIDE * sizeof(float));
	if (g_coins == NULL || g_transforms == NULL)
	{
		destroy_world();
		return 0;
	}

	b3WorldDef world_def = b3DefaultWorldDef();
	world_def.gravity = (b3Vec3){0.0f, gravity, 0.0f};
	world_def.capacity.dynamicBodyCount = coin_count + 1;
	g_world = b3CreateWorld(&world_def);

	create_box(0.0f, -0.3f, 0.0f, 8.0f, 0.3f, 8.0f);
	create_box(-8.15f, 4.7f, 0.0f, 0.15f, 5.0f, 8.0f);
	create_box(8.15f, 4.7f, 0.0f, 0.15f, 5.0f, 8.0f);
	create_box(0.0f, 4.7f, -8.15f, 8.0f, 5.0f, 0.15f);
	create_box(0.0f, 4.7f, 8.15f, 8.0f, 5.0f, 0.15f);

	if (pusher_enabled)
	{
		b3BodyDef pusher_def = b3DefaultBodyDef();
		pusher_def.type = b3_kinematicBody;
		pusher_def.position = (b3Pos){0.0f, 0.35f, -5.0f};
		g_pusher = b3CreateBody(g_world, &pusher_def);
		b3ShapeDef pusher_shape = b3DefaultShapeDef();
		pusher_shape.baseMaterial.friction = friction;
		b3BoxHull pusher_box = b3MakeBoxHull(6.0f, 0.35f, 0.6f);
		b3CreateHullShape(g_pusher, &pusher_shape, &pusher_box.base);
	}

	// The expensive hull computation happens once. b3CreateHullShape copies this shared source for every body.
	b3Vec3 points[48];
	for (int i = 0; i < segments; ++i)
	{
		float angle = 6.28318530718f * (float)i / (float)segments;
		float x = radius * cosf(angle);
		float z = radius * sinf(angle);
		points[i] = (b3Vec3){x, -0.5f * thickness, z};
		points[i + segments] = (b3Vec3){x, 0.5f * thickness, z};
	}
	b3HullData* coin_hull = b3CreateHull(points, segments * 2, segments * 2);
	if (coin_hull == NULL)
	{
		destroy_world();
		return 0;
	}

	b3ShapeDef coin_shape = b3DefaultShapeDef();
	coin_shape.density = 1000.0f;
	coin_shape.baseMaterial.friction = friction;
	coin_shape.baseMaterial.restitution = restitution;
	const int columns = 13;
	const float spacing = 1.08f * radius * 2.0f;
	for (int i = 0; i < coin_count; ++i)
	{
		int slot = i % (columns * columns);
		int layer = i / (columns * columns);
		int gx = slot % columns;
		int gz = slot / columns;
		float jitter_x = (random01() - 0.5f) * radius * 0.12f;
		float jitter_z = (random01() - 0.5f) * radius * 0.12f;
		float x = (gx - 0.5f * (columns - 1)) * spacing + jitter_x;
		float z = (gz - 0.5f * (columns - 1)) * spacing + jitter_z;
		float y = spawn_mode == 0 ? 2.0f + layer * 0.38f + random01() * 0.25f
			: 0.08f + layer * (thickness * 1.12f);
		b3BodyDef body_def = b3DefaultBodyDef();
		body_def.type = b3_dynamicBody;
		body_def.position = (b3Pos){x, y, z};
		body_def.rotation = b3MakeQuatFromAxisAngle(b3Vec3_axisY, random01() * 6.28318530718f);
		g_coins[i] = b3CreateBody(g_world, &body_def);
		b3CreateHullShape(g_coins[i], &coin_shape, coin_hull);
	}
	b3DestroyHull(coin_hull);
	return 1;
}

EMSCRIPTEN_KEEPALIVE void step_world(float dt)
{
	if (g_paused || !b3World_IsValid(g_world)) return;
	if (g_pusher_enabled)
	{
		g_time += dt;
		b3WorldTransform target = {{0.0f, 0.35f, -4.7f + 1.4f * sinf(g_time * 0.8f)}, b3Quat_identity};
		b3Body_SetTargetTransform(g_pusher, target, dt, true);
	}
	b3World_Step(g_world, dt, 4);
	if (g_recycle)
	{
		for (int i = 0; i < g_coin_count; ++i)
		{
			b3Pos p = b3Body_GetPosition(g_coins[i]);
			if (p.y < -10.0f)
			{
				p = (b3Pos){(random01() - 0.5f) * 10.0f, 8.0f + random01() * 2.0f, (random01() - 0.5f) * 10.0f};
				b3Body_SetTransform(g_coins[i], p, b3Quat_identity);
				b3Body_SetLinearVelocity(g_coins[i], b3Vec3_zero);
				b3Body_SetAngularVelocity(g_coins[i], b3Vec3_zero);
			}
		}
	}
}

EMSCRIPTEN_KEEPALIVE int get_coin_count(void) { return g_coin_count; }

EMSCRIPTEN_KEEPALIVE uintptr_t get_transform_buffer(void)
{
	// One contiguous write keeps the JS/WASM boundary at one call per rendered frame.
	for (int i = 0; i < g_coin_count; ++i)
	{
		b3WorldTransform t = b3Body_GetTransform(g_coins[i]);
		float* out = g_transforms + i * TRANSFORM_STRIDE;
		out[0] = (float)t.p.x; out[1] = (float)t.p.y; out[2] = (float)t.p.z; out[3] = 0.0f;
		out[4] = t.q.v.x; out[5] = t.q.v.y; out[6] = t.q.v.z; out[7] = t.q.s;
	}
	return (uintptr_t)g_transforms;
}

EMSCRIPTEN_KEEPALIVE uintptr_t get_stats_buffer(void)
{
	if (b3World_IsValid(g_world))
	{
		b3Counters counters = b3World_GetCounters(g_world);
		b3Profile profile = b3World_GetProfile(g_world);
		g_stats[0] = (float)counters.bodyCount;
		g_stats[1] = (float)b3World_GetAwakeBodyCount(g_world);
		g_stats[2] = profile.step;
		g_stats[3] = (float)counters.contactCount;
	}
	return (uintptr_t)g_stats;
}

EMSCRIPTEN_KEEPALIVE void set_paused(int paused) { g_paused = paused != 0; }
