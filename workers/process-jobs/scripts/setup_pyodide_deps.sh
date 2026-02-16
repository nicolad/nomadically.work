#!/bin/bash
# setup_pyodide_deps.sh - Setup dependencies that can't be installed via pywrangler
#
# This script handles packages that have no Pyodide wheels:
# - langchain>=1.0.0, langgraph, langgraph_sdk (manually extracted wheels)
# - langgraph-checkpoint-cloudflare-d1 (manually extracted)
# - xxhash, ormsgpack, tenacity (pure Python stubs from stubs/ directory)
#
# Based on langchain-cloudflare/libs/langchain-cloudflare/examples/workers/scripts/setup_pyodide_deps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_MODULES="$PROJECT_DIR/python_modules"
STUBS_DIR="$PROJECT_DIR/stubs"
TEMP_DIR="$PROJECT_DIR/.wheels_temp"

# Wheel versions
LANGCHAIN_VERSION="1.0.0"
LANGCHAIN_CORE_VERSION="1.1.0"
LANGGRAPH_VERSION="1.0.0"
LANGGRAPH_SDK_VERSION="0.3.1"
LANGGRAPH_CHECKPOINT_VERSION="2.1.0"
LANGGRAPH_CHECKPOINT_D1_VERSION="0.1.0"

echo "=== Setting up Pyodide-incompatible dependencies ==="
echo "Project: $PROJECT_DIR"

# ---------------------------------------------------------------------------
# Download & extract a pure-Python wheel into python_modules/
# ---------------------------------------------------------------------------
download_and_extract_wheel() {
    local package=$1
    local version=$2
    local wheel_name="${package//-/_}-${version}-py3-none-any.whl"
    local url="https://files.pythonhosted.org/packages/py3/${package:0:1}/${package}/${wheel_name}"

    echo "Downloading $package $version..."
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"

    # Try direct URL, fall back to pip download
    if ! curl -sL -o "$wheel_name" "$url" 2>/dev/null || [ ! -s "$wheel_name" ]; then
        echo "  Direct download failed, using pip..."
        pip download --no-deps --python-version 3.12 --platform any --only-binary=:all: "${package}==${version}" 2>/dev/null || \
        pip download --no-deps "${package}==${version}" 2>/dev/null
        wheel_name=$(ls ${package//-/_}*.whl 2>/dev/null | head -1)
    fi

    if [ -n "$wheel_name" ] && [ -f "$wheel_name" ]; then
        echo "  Extracting $wheel_name to python_modules..."
        mkdir -p "$PYTHON_MODULES"
        unzip -q -o "$wheel_name" -d "$PYTHON_MODULES"
        rm -f "$wheel_name"
    else
        echo "  ERROR: Failed to download $package $version"
        return 1
    fi

    cd "$PROJECT_DIR"
}

# ---------------------------------------------------------------------------
# Build and Copy Stubs (from stubs/ directory, following langchain-cloudflare pattern)
# ---------------------------------------------------------------------------
build_stub() {
    local stub_name=$1
    local stub_dir="$STUBS_DIR/${stub_name}-stub"

    if [ ! -d "$stub_dir" ]; then
        echo "ERROR: Stub directory not found: $stub_dir"
        return 1
    fi

    echo "Building $stub_name stub..."
    local src_package="$stub_dir/src/$stub_name"
    if [ -d "$src_package" ]; then
        echo "  Copying $stub_name to python_modules..."
        rm -rf "$PYTHON_MODULES/$stub_name"
        cp -r "$src_package" "$PYTHON_MODULES/"
    else
        echo "  ERROR: Source package not found: $src_package"
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

echo ""
echo "Step 1: Downloading and extracting wheels..."

# Clean old versions
rm -rf "$PYTHON_MODULES/langchain" "$PYTHON_MODULES/langchain-"*.dist-info 2>/dev/null || true
rm -rf "$PYTHON_MODULES/langchain_core" "$PYTHON_MODULES/langchain_core-"*.dist-info 2>/dev/null || true
rm -rf "$PYTHON_MODULES/langgraph" "$PYTHON_MODULES/langgraph-"*.dist-info 2>/dev/null || true
rm -rf "$PYTHON_MODULES/langgraph_sdk" "$PYTHON_MODULES/langgraph_sdk-"*.dist-info 2>/dev/null || true
rm -rf "$PYTHON_MODULES/langgraph_checkpoint" "$PYTHON_MODULES/langgraph_checkpoint-"*.dist-info 2>/dev/null || true
rm -rf "$PYTHON_MODULES/langgraph_checkpoint_cloudflare_d1" 2>/dev/null || true

download_and_extract_wheel "langchain" "$LANGCHAIN_VERSION"
download_and_extract_wheel "langchain-core" "$LANGCHAIN_CORE_VERSION"
download_and_extract_wheel "langgraph" "$LANGGRAPH_VERSION"
download_and_extract_wheel "langgraph-sdk" "$LANGGRAPH_SDK_VERSION"
download_and_extract_wheel "langgraph-checkpoint" "$LANGGRAPH_CHECKPOINT_VERSION"
download_and_extract_wheel "langgraph-checkpoint-cloudflare-d1" "$LANGGRAPH_CHECKPOINT_D1_VERSION"

echo ""
echo "Step 2: Fixing namespace packages for Pyodide..."
# Pyodide requires explicit __init__.py for all packages
find "$PYTHON_MODULES/langgraph" -type d ! -path '*/.*' | while read dir; do
    if [ ! -f "$dir/__init__.py" ]; then
        echo "  Creating $dir/__init__.py"
        touch "$dir/__init__.py"
    fi
done

echo ""
echo "Step 3: Building and copying stubs..."

rm -rf "$PYTHON_MODULES/xxhash" "$PYTHON_MODULES/ormsgpack" "$PYTHON_MODULES/tenacity" 2>/dev/null || true

build_stub "xxhash"
build_stub "ormsgpack"
build_stub "tenacity"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=== Setup complete ==="
echo "Installed packages:"
ls -d "$PYTHON_MODULES/langchain"* "$PYTHON_MODULES/langgraph"* 2>/dev/null | xargs -n1 basename 2>/dev/null || true
echo "Installed stubs:"
ls -d "$PYTHON_MODULES/xxhash" "$PYTHON_MODULES/ormsgpack" "$PYTHON_MODULES/tenacity" 2>/dev/null | xargs -n1 basename 2>/dev/null || true
