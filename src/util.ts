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