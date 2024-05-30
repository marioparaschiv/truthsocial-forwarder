import { NodeHtmlMarkdown } from 'node-html-markdown';
import { createLogger } from '~/structures/logger';
import store from '~/structures/store';
import { parseHtmlEntities } from '~/utilities';

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
	created_at: string,
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

		let lastBlog: Blog;

		store.data['lastChecked'] ??= new Date().setDate(new Date().getDate() - 1);
		const lastChecked = store.data['lastChecked'];

		do {
			if (lastBlog && new Date(lastBlog.created_at) < new Date(lastChecked)) break;

			console.log('fetching, max id = ', lastBlog?.id);
			const data = await fetch(BASE_URL + `/accounts/${id}/statuses?exclude_replies=true&with_muted=false${lastBlog?.id ? '&max_id=' + lastBlog.id : ''}`).then(r => r.json());

			store.data['lastChecked'] = new Date();


			if (Array.isArray(data)) {
				if (!data.length) break;

				const lastIndex = data.length - 1;
				lastBlog = data[lastIndex];

				result.push(...data);
			}
		} while (lastBlog.id);
	} catch (error) {
		logger.error(`Failed to fetch blogs for account ${id}:`, error);
	}

	return result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
			if (!file) continue;

			result.push(file);
		} catch (error) {
			logger.error(`Failed to fetch attachment ${attachment.url}:`, error);
		}
	}

	return result;
}

export async function getFile(url: string): Promise<File> {
	logger.info(`Download file from ${url}...`);
	const buf = await fetch(url).then(r => r.arrayBuffer());
	logger.info(`Downloaded file from ${url}.`);

	if ((buf.byteLength / 1024) >= 25000) {
		logger.warn("Skipping file as it is over Discord's limit.");
		return null;
	};

	return {
		name: url.split('/').pop(),
		buffer: Buffer.from(buf)
	};
}