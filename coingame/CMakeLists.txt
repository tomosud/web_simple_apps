cmake_minimum_required(VERSION 3.21)
project(box3d_coin_benchmark C)

set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(BOX3D_SAMPLES OFF CACHE BOOL "" FORCE)
set(BOX3D_UNIT_TESTS OFF CACHE BOOL "" FORCE)
set(BOX3D_BENCHMARKS OFF CACHE BOOL "" FORCE)
set(BOX3D_DOCS OFF CACHE BOOL "" FORCE)

add_subdirectory(extern/box3d)
add_executable(box3d_bridge native/box3d_bridge.c)
target_link_libraries(box3d_bridge PRIVATE box3d::box3d)

if(EMSCRIPTEN)
  set_target_properties(box3d_bridge PROPERTIES
    OUTPUT_NAME "box3d_bridge"
    SUFFIX ".js"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/wasm")
  target_link_options(box3d_bridge PRIVATE
    "-O3"
    "-sMODULARIZE=1"
    "-sEXPORT_NAME=createBox3DModule"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sENVIRONMENT=web"
    "-sFILESYSTEM=0"
    "-sEXPORTED_RUNTIME_METHODS=['HEAPF32']"
    "-sASSERTIONS=0"
    "-sEXPORTED_FUNCTIONS=['_init_world','_reset_world','_step_world','_get_coin_count','_get_transform_buffer','_get_stats_buffer','_set_paused','_destroy_world']")
endif()

