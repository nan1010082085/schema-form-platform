#!/bin/bash
# e2e-test.sh - 端到端测试脚本
# 用于验证完整业务流程

set -e

echo "=== Schema Form Platform 端到端测试 ==="
echo "开始时间: $(date)"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name=$1
    local test_command=$2

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $test_name ... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 检查服务是否运行
check_service() {
    local service_name=$1
    local url=$2

    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        return 0
    else
        return 1
    fi
}

echo "=== 第一阶段：服务健康检查 ==="

run_test "API 服务健康检查" "curl -s http://localhost:3001/api/health | grep -q '\"status\":\"ok\"'"
run_test "数据库连接检查" "curl -s http://localhost:3001/api/health | grep -q '\"database\":\"connected\"'"
run_test "Shell 服务检查" "check_service 'Shell' 'http://localhost:4100'"
run_test "Admin 服务检查" "check_service 'Admin' 'http://localhost:5400'"

echo ""
echo "=== 第二阶段：用户认证流程 ==="

# 测试登录
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null || echo "")

run_test "用户登录 API" "echo '$LOGIN_RESPONSE' | grep -q 'accessToken'"

# 提取 token
if [ -n "$LOGIN_RESPONSE" ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
else
    TOKEN=""
fi

if [ -n "$TOKEN" ]; then
    run_test "获取用户信息" "curl -s http://localhost:3001/api/auth/me -H 'Authorization: Bearer $TOKEN' | grep -q 'username'"
    run_test "获取用户菜单" "curl -s http://localhost:3001/api/menus/route -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
    run_test "获取微应用配置" "curl -s http://localhost:3001/api/micro-apps -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
else
    echo -e "${YELLOW}跳过认证相关测试（登录失败）${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 3))
    FAILED_TESTS=$((FAILED_TESTS + 3))
fi

echo ""
echo "=== 第三阶段：微应用加载测试 ==="

run_test "Editor 微应用加载" "check_service 'Editor' 'http://localhost:5173'"
run_test "Flow 微应用加载" "check_service 'Flow' 'http://localhost:5174'"
run_test "AI 微应用加载" "check_service 'AI' 'http://localhost:5175'"

echo ""
echo "=== 第四阶段：API 功能测试 ==="

if [ -n "$TOKEN" ]; then
    # 测试 Schema CRUD
    SCHEMA_RESPONSE=$(curl -s -X POST http://localhost:3001/api/schemas \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"name":"E2E Test Schema","type":"form","json":[]}' 2>/dev/null || echo "")

    run_test "创建 Schema" "echo '$SCHEMA_RESPONSE' | grep -q 'name'"

    # 提取 Schema ID
    if [ -n "$SCHEMA_RESPONSE" ]; then
        SCHEMA_ID=$(echo "$SCHEMA_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)

        if [ -n "$SCHEMA_ID" ]; then
            run_test "获取 Schema 列表" "curl -s http://localhost:3001/api/schemas -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
            run_test "获取单个 Schema" "curl -s http://localhost:3001/api/schemas/$SCHEMA_ID -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
            run_test "更新 Schema" "curl -s -X PUT http://localhost:3001/api/schemas/$SCHEMA_ID -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{\"name\":\"E2E Test Schema Updated\"}' | grep -q 'name'"
            run_test "删除 Schema" "curl -s -X DELETE http://localhost:3001/api/schemas/$SCHEMA_ID -H 'Authorization: Bearer $TOKEN' | grep -q 'success'"
        else
            echo -e "${YELLOW}跳过 Schema 操作测试（无法获取 ID）${NC}"
            TOTAL_TESTS=$((TOTAL_TESTS + 4))
            FAILED_TESTS=$((FAILED_TESTS + 4))
        fi
    else
        echo -e "${YELLOW}跳过 Schema 操作测试（创建失败）${NC}"
        TOTAL_TESTS=$((TOTAL_TESTS + 5))
        FAILED_TESTS=$((FAILED_TESTS + 5))
    fi

    # 测试用户管理
    run_test "获取用户列表" "curl -s http://localhost:3001/api/users -H 'Authorization: Bearer $TOKEN' | grep -q 'username'"
    run_test "获取角色列表" "curl -s http://localhost:3001/api/roles -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
    run_test "获取部门列表" "curl -s http://localhost:3001/api/depts -H 'Authorization: Bearer $TOKEN' | grep -q 'name'"
else
    echo -e "${YELLOW}跳过 API 功能测试（无有效 Token）${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 8))
    FAILED_TESTS=$((FAILED_TESTS + 8))
fi

echo ""
echo "=== 第五阶段：退出登录测试 ==="

if [ -n "$TOKEN" ]; then
    LOGOUT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/logout \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "")
    run_test "退出登录" "echo '$LOGOUT_RESPONSE' | grep -q 'success'"
else
    echo -e "${YELLOW}跳过退出登录测试（无有效 Token）${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "=== 测试结果汇总 ==="
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo "通过率: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "结束时间: $(date)"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}=== 所有测试通过 ===${NC}"
    exit 0
else
    echo -e "${RED}=== 存在失败测试 ===${NC}"
    exit 1
fi
