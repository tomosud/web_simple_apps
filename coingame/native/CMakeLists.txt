# The root CMakeLists owns the final Emscripten link so Box3D and this bridge share one module.
add_library(box3d_coin_bridge OBJECT box3d_bridge.c)
