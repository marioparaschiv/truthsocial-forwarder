import { NodeHtmlMarkdown } from 'node-html-markdown';
import { createLogger } from '~/structures/logger';
import { parseHtmlEntities } from '~/utilities';
import config from '~/../config.json';

const BASE_URL = 'https://truthsocial.com/api/v1';

const logger = createLogger('Truthsocial');

export interface Attachment {
	id: string;
	type: 'image';
	url: string;
}


export interface Blog {
	id: string,
	url: string,
	content: string,
	account: {
		username: string,
		display_name: string,
		avatar: string,
	},
	media_attachments: Attachment[],
}

export interface File {
	name: string;
	buffer: Buffer;
}

export async function getBlogs(id: string): Promise<Blog[]> {
	const result: Blog[] = [];

	try {

		let lastId = 1337;

		do {
			console.log('fetching, max id = ', lastId);
			const data = await fetch(BASE_URL + `/accounts/${id}/statuses?exclude_replies=true&with_muted=true${lastId !== 1337 ? '&max_id=' + lastId : ''}`).then(r => r.json());

			// const payloads = Object.values(store.data);
			const largestId = data.reduce((prev, current) => (prev && prev.id > current.id) ? prev : current, { id: null });
			if (largestId.id < config.startFromBlogId) break;

			if (Array.isArray(data)) {
				if (!data.length) break;

				const lastIndex = data.length - 1;
				lastId = data[lastIndex]?.id;

				result.push(...data);
			}
		} while (lastId);
	} catch (error) {
		logger.error(`Failed to fetch blogs for account ${id}:`, error);
	}

	return result;
}

export async function getContentFromBlog(blog: Blog) {
	if (!blog.content) return;

	return NodeHtmlMarkdown.translate(parseHtmlEntities(blog.content));
}

export async function getFilesFromBlog(blog: Blog): Promise<File[]> {
	const result: File[] = [];

	for (const attachment of blog.media_attachments) {
		try {
			const file = await getFile(attachment.url);

			result.push(file);
		} catch (error) {
			logger.error(`Failed to fetch attachment ${attachment.url}:`, error);
		}
	}

	return result;
}

export async function getFile(url: string): Promise<File> {
	const buf = await fetch(url).then(r => r.arrayBuffer());

	return {
		name: url.split('/').pop(),
		buffer: Buffer.from(buf)
	};
}