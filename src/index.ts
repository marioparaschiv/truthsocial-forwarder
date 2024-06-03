import { getFilesFromBlog, getBlogs, getContentFromBlog } from '~/truthsocial';
import { createLogger } from '~/structures/logger';
import webhook from '~/structures/webhook';
import store from '~/structures/store';
import config from '~/../config.json';
import { sleep } from '~/utilities';

require('source-map-support').install();

const logger = createLogger('Forwarder');

async function check() {
	const blogs = await getBlogs(config.user);

	for (const blog of blogs) {
		if (!blog || !blog.id || store.data[blog.id]) continue;

		logger.info(`Forwarding blog ${blog.id}...`);

		const files = await getFilesFromBlog(blog);
		const content = await getContentFromBlog(blog);

		await webhook.send({
			// @ts-ignore
			avatar_url: blog.account.avatar,
			// @ts-ignore
			username: blog.account.display_name,
			content: [
				content || '*No content.*',
				blog.media_attachments.length !== files.length && '\n**Some media was redacted due to the file size being too big.**',
				blog.media_attachments.length !== files.length && blog.media_attachments.filter(attachment => !files.some(file => file.url === attachment.url)).map(attachment => attachment.url),
				`[\`↖\`](<${blog.url}>)`
			].filter(Boolean).join('\n')
		}, files);

		store.data[blog.id] = blog;

		logger.info(`Forwarded thread ${blog.id}.`);
	}

	await sleep(config.delay);
	check();
}

check();