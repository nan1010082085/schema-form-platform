#!/bin/bash
# test-coverage.sh - 测试覆盖率报告脚本
# 用于生成各模块的测试覆盖率报告

set -e

echo "=== Schema Form Platform 测试覆盖率报告 ==="
echo "生成时间: $(date)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 覆盖率阈值
COVERAGE_THRESHOLD=80

echo -e "${BLUE}=== 模块测试覆盖率 ===${NC}"
echo ""

# 生成各模块覆盖率报告
generate_coverage() {
    local module_name=$1
    local module_path=$2

    echo -e "${YELLOW}$module_name:${NC}"
    echo "  路径: $module_path"

    # 运行测试并生成覆盖率
    if pnpm --filter "$module_name" test -- --coverage > /dev/null 2>&1; then
        echo -e "  状态: ${GREEN}成功${NC}"
    else
        echo -e "  状态: ${YELLOW}部分测试失败${NC}"
    fi

    echo ""
}

# 生成各模块覆盖率
generate_coverage "@schema-form/server" "packages/server"
generate_coverage "@schema-form/editor-web" "packages/editor/web"
generate_coverage "@schema-form/flow-web" "packages/flow/web"
generate_coverage "@schema-form/ai-app" "packages/ai/app"

echo -e "${BLUE}=== 测试统计汇总 ===${NC}"
echo ""

# 统计各模块测试数量
count_tests() {
    local module_path=$1
    local module_name=$2

    local test_files=$(find "$module_path" -name "*.spec.ts" -o -name "*.test.ts" | wc -l | tr -d ' ')
    local test_cases=$(find "$module_path" -name "*.spec.ts" -o -name "*.test.ts" -exec grep -l "describe\|it\|test" {} \; | wc -l | tr -d ' ')

    echo "$module_name:"
    echo "  测试文件: $test_files"
    echo "  测试用例: $test_cases"
    echo ""
}

count_tests "packages/server" "服务端"
count_tests "packages/editor/web" "编辑器"
count_tests "packages/flow/web" "流程"
count_tests "packages/ai/app" "AI 应用"

echo -e "${BLUE}=== 覆盖率建议 ===${NC}"
echo ""
echo "1. 核心模块覆盖率目标: > 80%"
echo "2. 工具函数覆盖率目标: > 90%"
echo "3. 组件覆盖率目标: > 70%"
echo "4. 集成测试覆盖率目标: > 60%"
echo ""
echo "查看详细覆盖率报告:"
echo "  pnpm --filter @schema-form/editor-web test -- --coverage"
echo "  pnpm --filter @schema-form/server test -- --coverage"
echo ""
echo "覆盖率报告位置:"
echo "  packages/editor/web/coverage/"
echo "  packages/server/coverage/"
