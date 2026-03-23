cmake_minimum_required(VERSION 3.20)

project(myclaw VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(MYCLAW_FETCH_SDL2 "Fetch SDL2 automatically if not found on system" ON)

add_executable(myclaw
    src/main.cpp
)

target_compile_definitions(myclaw PRIVATE SDL_MAIN_HANDLED)
target_include_directories(myclaw PRIVATE include)

find_package(SDL2 CONFIG QUIET)

if(NOT SDL2_FOUND AND MYCLAW_FETCH_SDL2)
    include(FetchContent)
    FetchContent_Declare(
        SDL2
        GIT_REPOSITORY https://github.com/libsdl-org/SDL.git
        GIT_TAG release-2.30.10
    )
    FetchContent_MakeAvailable(SDL2)
endif()

if(TARGET SDL2::SDL2)
    target_link_libraries(myclaw PRIVATE SDL2::SDL2)
elseif(TARGET SDL2::SDL2-static)
    target_link_libraries(myclaw PRIVATE SDL2::SDL2-static)
else()
    message(FATAL_ERROR "SDL2 not found. Install SDL2 development files or enable MYCLAW_FETCH_SDL2.")
endif()

set_property(DIRECTORY PROPERTY VS_STARTUP_PROJECT myclaw)
