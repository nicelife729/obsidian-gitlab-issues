export function sanitizeFileName(value: string) {
	return value
		.replace(/[:]/g, '')
		.replace(/[*"/\\<>|?]/g, '-');
}

export function adjustImageMarkdown(content: string, prefix: string): string {
	if (prefix === null || content === null) {
		return content;
	}

	const regex = /!\[image]\((\/uploads\/[a-zA-Z0-9]+\/image\.png)\)/g;
	const result = content.replace(regex, `![image](${prefix}$1)`);
	return result
}

export function adjustMarkdownLink(content: string, prefix: string): string {
	if (prefix === null || content === null) {
		return content;
	}
	
	const regex = /\[([^\]]+)]\((\/uploads\/[^\)]+)\)/g;
	const result = content.replace(regex, `[$1](${prefix}$2)`);
	return result
}

// 使用正则表达式替换除了_和-之外的所有符号为_
export function adjustLabels(content: string): string {
	if (content === null) {
		return content;
	}
	
	return content.replace(/[^a-zA-Z0-9_\u4e00-\u9fff-]/g, "_")
}

export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
  