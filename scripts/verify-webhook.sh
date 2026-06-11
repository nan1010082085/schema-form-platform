#!/bin/bash

# Webhook 系统验证脚本
# 用法: ./scripts/verify-webhook.sh [base_url]

set -e

BASE_URL="${1:-http://localhost:3001}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "=========================================="
echo "Webhook 系统验证"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL=0
PASSED=0
FAILED=0

# 辅助函数
check_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    TOTAL=$((TOTAL + 1))
    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected: $expected, got: $actual)"
        FAILED=$((FAILED + 1))
    fi
}

# 1. TypeScript 编译检查
echo "------------------------------------------"
echo "1. TypeScript 编译检查"
echo "------------------------------------------"

cd /Users/yangdongnan/work/schema-form-platform/packages/server
if pnpm build > /dev/null 2>&1; then
    check_result "TypeScript 编译" "0" "0"
else
    check_result "TypeScript 编译" "0" "1"
fi
echo ""

# 2. 权限种子数据检查
echo "------------------------------------------"
echo "2. 权限种子数据检查"
echo "------------------------------------------"

if grep -q "webhook:create" /Users/yangdongnan/work/schema-form-platform/packages/server/src/utils/seedPermissions.ts; then
    check_result "webhook:create 权限定义" "0" "0"
else
    check_result "webhook:create 权限定义" "0" "1"
    echo -e "${YELLOW}  缺少 webhook 权限定义${NC}"
fi

if grep -q "webhook:view" /Users/yangdongnan/work/schema-form-platform/packages/server/src/utils/seedPermissions.ts; then
    check_result "webhook:view 权限定义" "0" "0"
else
    check_result "webhook:view 权限定义" "0" "1"
fi

if grep -q "webhook:edit" /Users/yangdongnan/work/schema-form-platform/packages/server/src/utils/seedPermissions.ts; then
    check_result "webhook:edit 权限定义" "0" "0"
else
    check_result "webhook:edit 权限定义" "0" "1"
fi

if grep -q "webhook:delete" /Users/yangdongnan/work/schema-form-platform/packages/server/src/utils/seedPermissions.ts; then
    check_result "webhook:delete 权限定义" "0" "0"
else
    check_result "webhook:delete 权限定义" "0" "1"
fi
echo ""

# 3. Webhook 模型检查
echo "------------------------------------------"
echo "3. Webhook 模型检查"
echo "------------------------------------------"

if [ -f "src/models/Webhook.ts" ]; then
    check_result "Webhook 模型文件存在" "0" "0"

    if grep -q "retryPolicy" src/models/Webhook.ts; then
        check_result "retryPolicy 字段定义" "0" "0"
    else
        check_result "retryPolicy 字段定义" "0" "1"
    fi

    if grep -q "secret" src/models/Webhook.ts; then
        check_result "secret 字段定义" "0" "0"
    else
        check_result "secret 字段定义" "0" "1"
    fi
else
    check_result "Webhook 模型文件存在" "0" "1"
fi
echo ""

# 4. Webhook 路由检查
echo "------------------------------------------"
echo "4. Webhook 路由检查"
echo "------------------------------------------"

if [ -f "src/routes/webhook.ts" ]; then
    check_result "Webhook 路由文件存在" "0" "0"

    if grep -q "POST /" src/routes/webhook.ts; then
        check_result "POST 创建端点" "0" "0"
    else
        check_result "POST 创建端点" "0" "1"
    fi

    if grep -q "GET /" src/routes/webhook.ts; then
        check_result "GET 列表端点" "0" "0"
    else
        check_result "GET 列表端点" "0" "1"
    fi

    if grep -q "router.put" src/routes/webhook.ts; then
        check_result "PUT 更新端点" "0" "0"
    else
        check_result "PUT 更新端点" "0" "1"
    fi

    if grep -q "router.delete" src/routes/webhook.ts; then
        check_result "DELETE 删除端点" "0" "0"
    else
        check_result "DELETE 删除端点" "0" "1"
    fi

    if grep -q "logs" src/routes/webhook.ts; then
        check_result "GET 日志端点" "0" "0"
    else
        check_result "GET 日志端点" "0" "1"
    fi
else
    check_result "Webhook 路由文件存在" "0" "1"
fi
echo ""

# 5. Webhook Dispatcher 检查
echo "------------------------------------------"
echo "5. Webhook Dispatcher 检查"
echo "------------------------------------------"

if [ -f "src/services/webhookDispatcher.ts" ]; then
    check_result "Webhook Dispatcher 文件存在" "0" "0"

    if grep -q "signPayload" src/services/webhookDispatcher.ts; then
        check_result "签名生成函数" "0" "0"
    else
        check_result "签名生成函数" "0" "1"
    fi

    if grep -q "X-Webhook-Signature" src/services/webhookDispatcher.ts; then
        check_result "签名头部传递" "0" "0"
    else
        check_result "签名头部传递" "0" "1"
    fi

    if grep -q "deliverWithRetry" src/services/webhookDispatcher.ts; then
        check_result "重试逻辑" "0" "0"
    else
        check_result "重试逻辑" "0" "1"
    fi

    if grep -q "getBackoffDelay" src/services/webhookDispatcher.ts; then
        check_result "指数退避算法" "0" "0"
    else
        check_result "指数退避算法" "0" "1"
    fi
else
    check_result "Webhook Dispatcher 文件存在" "0" "1"
fi
echo ""

# 6. Event Bus 检查
echo "------------------------------------------"
echo "6. Event Bus 检查"
echo "------------------------------------------"

if [ -f "src/services/eventBus.ts" ]; then
    check_result "Event Bus 文件存在" "0" "0"

    if grep -q "schema.published" src/services/eventBus.ts; then
        check_result "schema.published 事件" "0" "0"
    else
        check_result "schema.published 事件" "0" "1"
    fi

    if grep -q "submission.created" src/services/eventBus.ts; then
        check_result "submission.created 事件" "0" "0"
    else
        check_result "submission.created 事件" "0" "1"
    fi

    if grep -q "flow.completed" src/services/eventBus.ts; then
        check_result "flow.completed 事件" "0" "0"
    else
        check_result "flow.completed 事件" "0" "1"
    fi

    if grep -q "flow.rejected" src/services/eventBus.ts; then
        check_result "flow.rejected 事件" "0" "0"
    else
        check_result "flow.rejected 事件" "0" "1"
    fi
else
    check_result "Event Bus 文件存在" "0" "1"
fi
echo ""

# 7. Schema 验证检查
echo "------------------------------------------"
echo "7. Schema 验证检查"
echo "------------------------------------------"

if [ -f "src/schemas/webhookSchemas.ts" ]; then
    check_result "Webhook Schema 文件存在" "0" "0"

    if grep -q "createWebhookSchema" src/schemas/webhookSchemas.ts; then
        check_result "创建 Schema 定义" "0" "0"
    else
        check_result "创建 Schema 定义" "0" "1"
    fi

    if grep -q "updateWebhookSchema" src/schemas/webhookSchemas.ts; then
        check_result "更新 Schema 定义" "0" "0"
    else
        check_result "更新 Schema 定义" "0" "1"
    fi

    if grep -q "SUPPORTED_EVENTS" src/schemas/webhookSchemas.ts; then
        check_result "支持的事件类型" "0" "0"
    else
        check_result "支持的事件类型" "0" "1"
    fi
else
    check_result "Webhook Schema 文件存在" "0" "1"
fi
echo ""

# 8. 事件触发检查
echo "------------------------------------------"
echo "8. 事件触发检查"
echo "------------------------------------------"

if grep -q "eventBus.emit.*schema.published" src/routes/schema.ts; then
    check_result "Schema 发布事件触发" "0" "0"
else
    check_result "Schema 发布事件触发" "0" "1"
fi

if grep -q "eventBus.emit.*submission.created" src/routes/submission.ts; then
    check_result "表单提交事件触发" "0" "0"
else
    check_result "表单提交事件触发" "0" "1"
fi

if grep -q "eventBus.emit.*flow.completed" src/flow-services/FlowEngine.ts; then
    check_result "流程完成事件触发" "0" "0"
else
    check_result "流程完成事件触发" "0" "1"
fi

if grep -q "eventBus.emit.*flow.rejected" src/flow-services/FlowEngine.ts; then
    check_result "流程拒绝事件触发" "0" "0"
else
    check_result "流程拒绝事件触发" "0" "1"
fi
echo ""

# 9. 测试文件检查
echo "------------------------------------------"
echo "9. 测试文件检查"
echo "------------------------------------------"

WEBHOOK_TEST_COUNT=$(find src/__tests__ -name "*webhook*" -o -name "*Webhook*" 2>/dev/null | wc -l)
if [ "$WEBHOOK_TEST_COUNT" -gt 0 ]; then
    check_result "Webhook 测试文件" "0" "0"
else
    check_result "Webhook 测试文件" "0" "1"
    echo -e "${YELLOW}  缺少 webhook 专用测试文件${NC}"
fi
echo ""

# 10. 路由注册检查
echo "------------------------------------------"
echo "10. 路由注册检查"
echo "------------------------------------------"

if grep -q "webhookRouter" src/app.ts; then
    check_result "Webhook 路由注册" "0" "0"
else
    check_result "Webhook 路由注册" "0" "1"
fi

if grep -q "initWebhookDispatcher" src/handler.ts; then
    check_result "Dispatcher 初始化" "0" "0"
else
    check_result "Dispatcher 初始化" "0" "1"
fi
echo ""

# 总结
echo "=========================================="
echo "验证总结"
echo "=========================================="
echo "总计测试: $TOTAL"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}发现 $FAILED 个问题需要修复${NC}"
    exit 1
else
    echo -e "${GREEN}所有检查通过！${NC}"
    exit 0
fi
