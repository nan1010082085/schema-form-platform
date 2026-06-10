# 监控系统配置说明

本目录包含 Schema Form Platform 监控系统的配置文件。

## 文件说明

### monitoring.yml
主监控配置文件，包含以下配置：
- 服务健康检查配置
- 性能监控配置
- 告警配置
- 日志监控配置
- 业务指标监控配置
- 系统资源监控配置
- 监控数据存储配置
- 监控仪表盘配置
- 监控脚本配置

## 快速开始

### 1. 配置环境变量

创建 `.env.monitoring` 文件：

```bash
# SMTP 配置
SMTP_PASSWORD=your_smtp_password

# Slack 配置
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

# Grafana 配置
GRAFANA_PASSWORD=your_grafana_password

# Twilio 配置（可选）
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

### 2. 启动监控服务

```bash
# 启动 Prometheus
docker run -d --name prometheus \
  -p 9090:9090 \
  -v ./prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# 启动 Grafana
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana

# 启动 Alertmanager
docker run -d --name alertmanager \
  -p 9093:9093 \
  -v ./alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

### 3. 配置 Grafana 数据源

1. 访问 http://localhost:3000
2. 使用 admin/admin 登录
3. 添加 Prometheus 数据源：http://prometheus:9090
4. 导入仪表盘模板

### 4. 启动监控脚本

```bash
# 启动健康检查监控
./scripts/monitor.sh --loop

# 或使用 systemd 服务
sudo systemctl enable schema-form-monitor
sudo systemctl start schema-form-monitor
```

## 监控指标说明

### 服务状态指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| api_status | API 服务状态 | != ok |
| database_status | 数据库连接状态 | != connected |
| frontend_status | 前端服务状态 | HTTP != 200 |

### 性能指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| api_response_time_p95 | API 95% 响应时间 | > 1s |
| api_response_time_p99 | API 99% 响应时间 | > 2s |
| micro_app_load_time | 微应用加载时间 | > 2s |
| database_query_time | 数据库查询时间 | > 100ms |

### 业务指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| active_users | 活跃用户数 | < 10 |
| login_success_rate | 登录成功率 | < 95% |
| error_rate | 错误率 | > 10% |

## 告警配置

### 告警级别

- **P0**: 服务完全不可用，5 分钟内响应
- **P1**: 核心功能不可用，15 分钟内响应
- **P2**: 非核心功能异常，1 小时内响应
- **P3**: 体验问题，24 小时内响应

### 告警渠道

- **邮件**: 所有级别告警
- **Slack**: P0-P1 级别告警
- **短信**: P0 级别告警（可选）

## 监控脚本

### 健康检查脚本

```bash
# 单次检查
./scripts/monitor.sh --check

# 循环监控
./scripts/monitor.sh --loop

# 生成报告
./scripts/monitor.sh --report
```

### 测试覆盖率脚本

```bash
# 生成覆盖率报告
./scripts/test-coverage.sh
```

### 端到端测试脚本

```bash
# 运行端到端测试
./scripts/e2e-test.sh
```

## 故障排查

### 常见问题

1. **Prometheus 无法连接**
   - 检查 Prometheus 服务是否启动
   - 检查防火墙设置
   - 检查配置文件路径

2. **Grafana 无法显示数据**
   - 检查 Prometheus 数据源配置
   - 检查 PromQL 查询语句
   - 检查时间范围设置

3. **告警未触发**
   - 检查告警规则配置
   - 检查 Alertmanager 配置
   - 检查通知渠道配置

### 日志查看

```bash
# 查看监控脚本日志
tail -f /var/log/schema-form/health-check.log

# 查看 Prometheus 日志
docker logs prometheus

# 查看 Grafana 日志
docker logs grafana
```

## 最佳实践

1. **监控覆盖**: 确保所有关键组件和业务流程都被监控
2. **告警分级**: 合理设置告警级别，避免告警疲劳
3. **定期审查**: 定期审查监控配置和告警规则
4. **容量规划**: 基于监控数据进行容量规划
5. **文档更新**: 及时更新监控文档和操作手册

## 相关文档

- [监控检查清单](../docs/monitoring-checklist.md)
- [监控仪表盘配置](../docs/monitoring-dashboard.md)
- [开发计划](../docs/development-plan.md)
