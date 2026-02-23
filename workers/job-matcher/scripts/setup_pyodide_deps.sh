#!/bin/bash
# setup_pyodide_deps.sh - Setup dependencies that can't be installed via pywrangler
#
# Downloads pure-Python wheels for packages with no Pyodide wheels:
# - langchain-core (pure Python wheel)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_MODULES="$PROJECT_DIR/python_modules"
TEMP_DIR="$PROJECT_DIR/.wheels_temp"

LANGCHAIN_CORE_VERSION="1.1.0"

echo "=== Setting up Pyodide-incompatible dependencies ==="
echo "Project: $PROJECT_DIR"

download_and_extract_wheel() {
    local package=$1
    local version=$2
    local wheel_name="${package//-/_}-${version}-py3-none-any.whl"
    local url="https://files.pythonhosted.org/packages/py3/${package:0:1}/${package}/${wheel_name}"

    echo "Downloading $package $version..."
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"

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

echo ""
echo "Step 1: Downloading and extracting wheels..."

rm -rf "$PYTHON_MODULES/langchain_core" "$PYTHON_MODULES/langchain_core-"*.dist-info 2>/dev/null || true

download_and_extract_wheel "langchain-core" "$LANGCHAIN_CORE_VERSION"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=== Setup complete ==="
echo "Installed packages:"
ls -d "$PYTHON_MODULES/langchain_core"* 2>/dev/null | xargs -n1 basename 2>/dev/null || true
