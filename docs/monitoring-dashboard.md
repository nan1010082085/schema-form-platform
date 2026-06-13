> 📋 状态：未来规划（当前基于 pm2 + nginx）

# Schema Form Platform 监控仪表盘配置

> 创建日期：2026/06/10
> 文档版本：v1.0

---

## 一、监控仪表盘概览

### 1.1 仪表盘布局

```
┌─────────────────────────────────────────────────────────────────┐
│                    Schema Form Platform 监控仪表盘                │
├─────────────────────────────────────────────────────────────────┤
│  [服务状态]  [性能指标]  [业务指标]  [告警信息]                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  API 服务状态     │  │  数据库状态      │  │  前端服务状态    │ │
│  │  ● 正常          │  │  ● 已连接        │  │  ● 5/5 正常     │ │
│  │  运行时间: 24h   │  │  连接数: 15      │  │  加载时间: 1.2s │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API 响应时间趋势图                        ││
│  │  200ms ┤                                                    ││
│  │  150ms ┤        ╭──╮                                        ││
│  │  100ms ┤    ╭──╯  ╰──╮                                      ││
│  │   50ms ┤───╯          ╰──╮                                  ││
│  │    0ms ┤                 ╰───────────────────────            ││
│  │        └─────────────────────────────────────────            ││
│  │        00:00  04:00  08:00  12:00  16:00  20:00             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  测试通过率      │  │  错误率          │  │  活跃用户        │ │
│  │  100%           │  │  0.1%           │  │  25             │ │
│  │  3232/3232      │  │  较昨日 -0.05%  │  │  较昨日 +5      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、监控指标配置

### 2.1 服务状态指标

| 指标名称 | 数据源 | 刷新频率 | 告警阈值 |
|----------|--------|----------|----------|
| API 服务状态 | /api/health | 30s | status != ok |
| 数据库连接 | /api/health | 30s | database != connected |
| 服务运行时间 | /api/health | 30s | uptime < 60s |
| 前端服务状态 | HTTP 状态码 | 1min | HTTP != 200 |

### 2.2 性能指标

| 指标名称 | 数据源 | 刷新频率 | 告警阈值 |
|----------|--------|----------|----------|
| API 平均响应时间 | 日志分析 | 1min | > 500ms |
| API 95% 响应时间 | 日志分析 | 1min | > 1s |
| API 99% 响应时间 | 日志分析 | 1min | > 2s |
| 微应用加载时间 | Performance API | 5min | > 2s |
| 数据库查询时间 | 日志分析 | 1min | > 100ms |

### 2.3 业务指标

| 指标名称 | 数据源 | 刷新频率 | 告警阈值 |
|----------|--------|----------|----------|
| 活跃用户数 | 认证日志 | 5min | < 10 |
| 登录成功率 | 认证日志 | 1hour | < 95% |
| Schema 创建数 | API 日志 | 1hour | - |
| 表单提交数 | API 日志 | 1hour | - |
| 流程实例数 | API 日志 | 1hour | - |

### 2.4 系统资源指标

| 指标名称 | 数据源 | 刷新频率 | 告警阈值 |
|----------|--------|----------|----------|
| CPU 使用率 | 系统监控 | 1min | > 80% |
| 内存使用率 | 系统监控 | 1min | > 80% |
| 磁盘使用率 | 系统监控 | 5min | > 80% |
| 网络流量 | 系统监控 | 1min | - |

---

## 三、Grafana 仪表盘配置

### 3.1 数据源配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'schema-form-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'mongodb-exporter'
    static_configs:
      - targets: ['localhost:9216']
```

### 3.2 Grafana 面板配置

```json
{
  "dashboard": {
    "title": "Schema Form Platform",
    "panels": [
      {
        "title": "API 服务状态",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"schema-form-api\"}",
            "legendFormat": "API Status"
          }
        ],
        "thresholds": {
          "steps": [
            { "color": "red", "value": 0 },
            { "color": "green", "value": 1 }
          ]
        }
      },
      {
        "title": "API 响应时间",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds{job=\"schema-form-api\"}",
            "legendFormat": "{{method}} {{handler}}"
          }
        ],
        "yaxes": [
          { "format": "s", "label": "Response Time" }
        ]
      },
      {
        "title": "数据库连接数",
        "type": "graph",
        "targets": [
          {
            "expr": "mongodb_connections{state=\"current\"}",
            "legendFormat": "Current Connections"
          }
        ]
      },
      {
        "title": "错误率",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ],
        "yaxes": [
          { "format": "percentunit", "label": "Error Rate" }
        ]
      }
    ]
  }
}
```

---

## 四、Prometheus 告警规则

### 4.1 告警规则配置

```yaml
# alerts.yml
groups:
  - name: schema-form-alerts
    rules:
      - alert: API 服务宕机
        expr: up{job="schema-form-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API 服务宕机"
          description: "API 服务已停止响应超过 1 分钟"

      - alert: API 响应时间过长
        expr: http_request_duration_seconds{quantile="0.95"} > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API 响应时间过长"
          description: "95% 的 API 请求响应时间超过 1 秒"

      - alert: 数据库连接失败
        expr: mongodb_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库连接失败"
          description: "无法连接到 MongoDB 数据库"

      - alert: 错误率过高
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "错误率过高"
          description: "API 错误率超过 10%"

      - alert: 磁盘空间不足
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "磁盘空间不足"
          description: "根分区可用空间不足 20%"

      - alert: 内存使用率过高
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "可用内存不足 20%"
```

---

## 五、日志监控配置

### 5.1 ELK Stack 配置

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/schema-form/*.log
    fields:
      app: schema-form
      env: production
    multiline.pattern: '^\d{4}-\d{2}-\d{2}'
    multiline.negate: true
    multiline.match: after

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "schema-form-%{+yyyy.MM.dd}"

setup.template.name: "schema-form"
setup.template.pattern: "schema-form-*"
```

### 5.2 日志索引模式

```json
{
  "index_patterns": ["schema-form-*"],
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "@timestamp": { "type": "date" },
      "level": { "type": "keyword" },
      "message": { "type": "text" },
      "service": { "type": "keyword" },
      "requestId": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "method": { "type": "keyword" },
      "path": { "type": "keyword" },
      "statusCode": { "type": "integer" },
      "responseTime": { "type": "integer" },
      "error": { "type": "text" }
    }
  }
}
```

---

## 六、告警通知配置

### 6.1 告警渠道配置

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@schema-form.com'
  smtp_auth_username: 'alerts@schema-form.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@schema-form.com'
        subject: '[{{ .Status }}] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          告警名称: {{ .Labels.alertname }}
          告警级别: {{ .Labels.severity }}
          告警描述: {{ .Annotations.description }}
          触发时间: {{ .StartsAt }}
          {{ end }}

  - name: 'critical'
    email_configs:
      - to: 'oncall@schema-form.com'
        subject: '[紧急] {{ .GroupLabels.alertname }}'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
        send_resolved: true
```

### 6.2 Slack 通知配置

```yaml
# slack.yml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *告警名称:* {{ .Labels.alertname }}
          *告警级别:* {{ .Labels.severity }}
          *告警描述:* {{ .Annotations.description }}
          *触发时间:* {{ .StartsAt }}
          {{ end }}
        send_resolved: true
```

---

## 七、监控脚本集成

### 7.1 定时任务配置

```bash
# crontab -l
# 每 5 分钟检查服务健康
*/5 * * * * /path/to/scripts/monitor.sh --check >> /var/log/monitor.log 2>&1

# 每小时生成监控报告
0 * * * * /path/to/scripts/monitor.sh --report >> /var/log/monitor-report.log 2>&1

# 每天凌晨 2 点运行全量测试
0 2 * * * /path/to/scripts/test-coverage.sh >> /var/log/test-coverage.log 2>&1

# 每周日凌晨 3 点运行端到端测试
0 3 * * 0 /path/to/scripts/e2e-test.sh >> /var/log/e2e-test.log 2>&1
```

### 7.2 systemd 服务配置

```ini
# /etc/systemd/system/schema-form-monitor.service
[Unit]
Description=Schema Form Platform Monitor
After=network.target

[Service]
Type=simple
User=monitor
WorkingDirectory=/path/to/schema-form-platform
ExecStart=/path/to/scripts/monitor.sh --loop
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## 八、监控数据保留策略

### 8.1 数据保留配置

| 数据类型 | 保留时间 | 存储位置 | 压缩策略 |
|----------|----------|----------|----------|
| 监控指标 | 30 天 | Prometheus | 5 分钟聚合 |
| 日志数据 | 7 天 | Elasticsearch | 每日索引 |
| 告警记录 | 90 天 | Alertmanager | 无 |
| 测试报告 | 30 天 | 文件系统 | 每周压缩 |

### 8.2 数据清理脚本

```bash
#!/bin/bash
# cleanup-monitoring-data.sh

# 清理 30 天前的监控指标
curl -X POST http://localhost:9090/api/v1/admin/tsdb/delete_series \
  --data-urlencode 'match[]={__name__=~".+"}' \
  --data-urlencode 'start=2024-01-01T00:00:00Z' \
  --data-urlencode 'end=2024-01-31T23:59:59Z'

# 清理 7 天前的日志索引
curl -X DELETE "http://localhost:9200/schema-form-$(date -d '7 days ago' +%Y.%m.%d)"

# 清理 30 天前的测试报告
find /var/log -name "test-coverage-*.log" -mtime +30 -delete
find /var/log -name "e2e-test-*.log" -mtime +30 -delete
```

---

## 九、监控最佳实践

### 9.1 监控原则

1. **全面性**: 监控所有关键组件和业务流程
2. **实时性**: 关键指标实时刷新，告警及时通知
3. **可操作性**: 告警信息包含足够的问题定位信息
4. **成本效益**: 平衡监控粒度和存储成本

### 9.2 告警最佳实践

1. **分级告警**: P0-P3 分级处理，避免告警疲劳
2. **告警聚合**: 相关告警合并通知，减少干扰
3. **告警抑制**: 维护窗口期间抑制非关键告警
4. **告警升级**: 长时间未处理自动升级告警级别

### 9.3 性能监控最佳实践

1. **基线建立**: 建立正常性能基线，便于异常检测
2. **趋势分析**: 关注指标趋势，提前预警潜在问题
3. **关联分析**: 关联不同指标，定位问题根因
4. **容量规划**: 基于历史数据进行容量规划

---

## 十、监控工具推荐

### 10.1 开源监控栈

| 组件 | 工具 | 用途 |
|------|------|------|
| 指标收集 | Prometheus | 时序数据收集和存储 |
| 可视化 | Grafana | 监控仪表盘 |
| 日志收集 | Filebeat + Elasticsearch | 日志聚合和分析 |
| 告警管理 | Alertmanager | 告警路由和通知 |
| 链路追踪 | Jaeger | 分布式链路追踪 |

### 10.2 云监控服务

| 服务 | 提供商 | 特点 |
|------|--------|------|
| CloudWatch | AWS | 深度集成 AWS 服务 |
| Stackdriver | Google Cloud | 强大的日志分析 |
| Azure Monitor | Azure | 企业级监控 |
| Datadog | Datadog | 全栈监控 |
| New Relic | New Relic | APM 深度分析 |

---

**文档版本历史**:
- v1.0 (2026/06/10)：初始版本，包含完整监控仪表盘配置
