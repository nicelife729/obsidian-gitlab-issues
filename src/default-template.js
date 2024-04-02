
export default `---
id: {{id}}
title: {{{title}}}
dueDate: {{due_date}}
webUrl: {{web_url}}
project: {{references.full}}
labels:
    {{#each labels}}
    - {{this}}
    {{/each}}
---

### {{{title}}}
##### Due on {{due_date}}

{{{description}}}

### 评论

{{#each notes}}
姓名：{{this.author.name}}
创建时间：{{this.created_at}}
修改时间: {{this.updated_at}}
内容：
{{this.body}}



{{/each}}


[View On Gitlab]({{web_url}})
`;


