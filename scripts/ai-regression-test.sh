#!/bin/bash
# AI 项目回归测试脚本
# 用法: bash scripts/ai-regression-test.sh [sprint]
# sprint: 1, 2, 3, all (默认 all)

set -e

SPRINT=${1:-all}
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================="
echo "AI 项目回归测试 - Sprint ${SPRINT}"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
PASSED=0
FAILED=0
SKIPPED=0

run_test() {
    local name=$1
    local cmd=$2

    echo -e "\n${YELLOW}▶ 运行: ${name}${NC}"

    if eval "$cmd" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ 失败${NC}"
        echo "错误输出:"
        cat /tmp/test_output.log | tail -20
        FAILED=$((FAILED + 1))
    fi
}

skip_test() {
    local name=$1
    echo -e "\n${YELLOW}⊘ 跳过: ${name}${NC}"
    SKIPPED=$((SKIPPED + 1))
}

# ==========================================
# 服务端测试
# ==========================================

echo -e "\n${YELLOW}=== 服务端测试 ===${NC}"

if [[ "$SPRINT" == "all" || "$SPRINT" == "1" ]]; then
    run_test "S1: 协作请求状态传递" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/graph.spec.ts"

    run_test "S2: Checkpointer 测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/checkpointer.spec.ts"
fi

if [[ "$SPRINT" == "all" || "$SPRINT" == "2" ]]; then
    run_test "S3-S6: Agent Base 测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/agentBase.spec.ts"

    run_test "S4-S5: 工具测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/widgetTools.spec.ts"

    run_test "S5: Flow 工具测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/flowTools.spec.ts"
fi

if [[ "$SPRINT" == "all" || "$SPRINT" == "3" ]]; then
    run_test "S7-S11: Routes 测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/routes.spec.ts"

    run_test "S8: Router 测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/server test -- packages/server/src/ai/__tests__/router.spec.ts"
fi

# ==========================================
# 前端测试
# ==========================================

echo -e "\n${YELLOW}=== 前端测试 ===${NC}"

if [[ "$SPRINT" == "all" || "$SPRINT" == "1" ]]; then
    run_test "F1: SSE 解析测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/ai-app test -- packages/ai-app/src/__tests__/aiApi.spec.ts"
fi

if [[ "$SPRINT" == "all" || "$SPRINT" == "2" || "$SPRINT" == "3" ]]; then
    run_test "F2-F6: Store 测试" \
        "cd $PROJECT_ROOT && pnpm --filter @schema-form/ai-app test -- packages/ai-app/src/__tests__/aiStore.spec.ts"
fi

# ==========================================
# 类型检查
# ==========================================

echo -e "\n${YELLOW}=== 类型检查 ===${NC}"

run_test "服务端类型检查" \
    "cd $PROJECT_ROOT && pnpm build:server"

# ==========================================
# 测试报告
# ==========================================

echo -e "\n=========================================="
echo "测试报告"
echo "=========================================="
echo -e "通过: ${GREEN}${PASSED}${NC}"
echo -e "失败: ${RED}${FAILED}${NC}"
echo -e "跳过: ${YELLOW}${SKIPPED}${NC}"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ 回归测试失败！${NC}"
    exit 1
else
    echo -e "${GREEN}✅ 回归测试通过！${NC}"
    exit 0
fi
