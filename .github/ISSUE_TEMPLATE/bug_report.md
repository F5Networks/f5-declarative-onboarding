---
name: Bug report
about: Report a defect in the product
title: ''
labels: bug, untriaged
assignees: ''

---

<!--
Github Issues are consistently monitored by F5 staff, but should be considered
as best effort only and you should not expect to receive the same level of
response as provided by F5 Support. Please open a case
(https://support.f5.com/csp/article/K2633) with F5 if this is a critical issue.

When filing an issue please check to see if an issue already exists that matches your's
-->

### Environment
 * Declarative Onboarding Version:
 * BIG-IP Version:

### Summary
A clear and concise description of what the bug is.
Please also include information about the reproducibility and the severity/impact of the issue.

### Steps To Reproduce
Steps to reproduce the behavior:
1. Submit the following declaration:
```json
{
    "schemaVersion": "1.6.0",
    "class": "Device",
    "Common": {
    	"class": "Tenant",
    	"hostname": "example.local"
    }
}
```

2. Observe the following error response:
```json
{
    "id": "62b57a65-ad1a-4ac4-8ddb-0427fad81b79",
    "selfLink": "https://localhost/mgmt/shared/declarative-onboarding/task/62b57a65-ad1a-4ac4-8ddb-0427fad81b79",
    "code": 400,
    "status": "ERROR",
    "message": "bad declaration",
    "errors": [
        "Unable to parse request body. Should be JSON format."
    ],
    "result": {
        "class": "Result",
        "code": 400,
        "status": "ERROR",
        "message": "bad declaration",
        "errors": [
            "Unable to parse request body. Should be JSON format."
        ]
    },
    "declaration": {}
}
```

### Expected Behavior
A clear and concise description of what you expected to happen.

### Actual Behavior
A clear and concise description of what actually happens.
Please include any applicable error output.

