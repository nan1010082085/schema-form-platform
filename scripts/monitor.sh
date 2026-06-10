#!/bin/bash
# monitor.sh - 自动化监控脚本
# 用于定期检查服务健康状态和性能指标

set -e

# 配置
HEALTH_URL="http://localhost:3001/api/health"
LOG_FILE="/tmp/schema-form-monitor.log"
ALERT_EMAIL="" # 设置告警邮箱
CHECK_INTERVAL=300 # 检查间隔（秒）

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 告警函数
alert() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo -e "${RED}[ALERT][$level] $message${NC}"
    log "ALERT [$level] $message"

    # 发送邮件告警（如果配置了邮箱）
    if [ -n "$ALERT_EMAIL" ]; then
        echo "[$timestamp] [$level] $message" | mail -s "Schema Form Platform Alert" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# 检查服务健康
check_health() {
    local response=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" != "200" ]; then
        alert "P0" "API 服务不可用 (HTTP $http_code)"
        return 1
    fi

    local status=$(echo "$body" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    local database=$(echo "$body" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
    local uptime=$(echo "$body" | grep -o '"uptime":[0-9]*' | cut -d':' -f2)

    if [ "$status" != "ok" ]; then
        alert "P0" "API 服务状态异常: $status"
        return 1
    fi

    if [ "$database" != "connected" ]; then
        alert "P0" "数据库连接断开"
        return 1
    fi

    log "健康检查通过 - 状态: $status, 数据库: $database, 运行时间: ${uptime}s"
    return 0
}

# 检查响应时间
check_response_time() {
    local start_time=$(date +%s%N)
    curl -s -o /dev/null "$HEALTH_URL" 2>/dev/null
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))

    if [ $duration -gt 5000 ]; then
        alert "P1" "API 响应时间过长: ${duration}ms"
    elif [ $duration -gt 1000 ]; then
        log "警告: API 响应时间较长: ${duration}ms"
    else
        log "响应时间正常: ${duration}ms"
    fi
}

# 检查前端服务
check_frontend() {
    local services=("Shell:4100" "Admin:5400" "Editor:5173" "Flow:5174" "AI:5175")

    for service in "${services[@]}"; do
        local name=${service%%:*}
        local port=${service##*:}

        if curl -s -o /dev/null "http://localhost:$port" 2>/dev/null; then
            log "$name 服务正常 (端口 $port)"
        else
            alert "P1" "$name 服务不可用 (端口 $port)"
        fi
    done
}

# 检查磁盘空间
check_disk_space() {
    local usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

    if [ $usage -gt 90 ]; then
        alert "P1" "磁盘空间不足: ${usage}%"
    elif [ $usage -gt 80 ]; then
        log "警告: 磁盘空间使用率较高: ${usage}%"
    else
        log "磁盘空间正常: ${usage}%"
    fi
}

# 检查内存使用
check_memory() {
    local usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

    if [ $usage -gt 90 ]; then
        alert "P1" "内存使用率过高: ${usage}%"
    elif [ $usage -gt 80 ]; then
        log "警告: 内存使用率较高: ${usage}%"
    else
        log "内存使用正常: ${usage}%"
    fi
}

# 检查日志错误
check_logs() {
    local error_count=$(pm2 logs schema-form-server --lines 100 --nostream 2>/dev/null | grep -c "Error\|Exception\|FATAL" || echo 0)

    if [ $error_count -gt 10 ]; then
        alert "P1" "错误日志过多: $error_count 条"
    elif [ $error_count -gt 0 ]; then
        log "警告: 发现 $error_count 条错误日志"
    else
        log "日志正常"
    fi
}

# 生成监控报告
generate_report() {
    echo -e "${BLUE}=== 监控报告 ===${NC}"
    echo "时间: $(date)"
    echo ""

    echo -e "${YELLOW}服务状态:${NC}"
    check_health
    echo ""

    echo -e "${YELLOW}前端服务:${NC}"
    check_frontend
    echo ""

    echo -e "${YELLOW}系统资源:${NC}"
    check_disk_space
    check_memory
    echo ""

    echo -e "${YELLOW}性能指标:${NC}"
    check_response_time
    echo ""

    echo -e "${YELLOW}日志状态:${NC}"
    check_logs
    echo ""
}

# 主监控循环
monitor_loop() {
    log "监控服务启动"

    while true; do
        generate_report
        sleep $CHECK_INTERVAL
    done
}

# 单次检查模式
single_check() {
    generate_report
}

# 显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help      显示帮助"
    echo "  -l, --loop      循环监控模式"
    echo "  -c, --check     单次检查模式"
    echo "  -r, --report    生成报告"
    echo ""
    echo "示例:"
    echo "  $0 --check      # 单次检查"
    echo "  $0 --loop       # 循环监控"
    echo "  $0 --report     # 生成报告"
}

# 主函数
main() {
    case "$1" in
        -h|--help)
            show_help
            ;;
        -l|--loop)
            monitor_loop
            ;;
        -c|--check)
            single_check
            ;;
        -r|--report)
            generate_report
            ;;
        *)
            single_check
            ;;
    esac
}

# 执行主函数
main "$@"
