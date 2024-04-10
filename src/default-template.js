
export default `---
id: {{id}}
iid: {{iid}}
state: {{state}}
createdAt: {{created_at}}
updatedAt: {{updated_at}}
author: {{author.name}}
tags:
    {{#each labels}}
    - {{this}}
    {{/each}}
   
webUrl: {{web_url}}
project: {{references.full}}
projectId: {{project_id}}
timeStats: {{time_stats.human_total_time_spent}}
notesIsBroken: {{notesIsBroken}}
---
### {{{title}}}

[View On Gitlab]({{web_url}})

#### 正文

{{{description}}}


#### 评论

{{#each notes}}
姓名：{{this.author.name}}
创建时间：{{this.created_at}}
修改时间: {{this.updated_at}}
内容：
{{this.body}}


{{/each}}
`;


