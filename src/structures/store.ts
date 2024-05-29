import { existsSync, readFileSync, writeFileSync } from 'fs';
import type { Blog } from '~/truthsocial';
import { join } from 'path';

class Store {
	data: Record<string, Blog> = {};
	path = join(__dirname, '..', '..', 'data.json');

	constructor() {
		const _this = this;

		if (existsSync(this.path)) {
			try {
				const content = readFileSync(this.path, 'utf-8');

				const data = JSON.parse(content);


				this.data = new Proxy(data, {
					get(target, prop) {
						return target[prop];
					},

					set(target, prop, value) {
						const result = (target[prop] = value);

						_this.save();

						return result;
					}
				});
			} catch (error) {
				console.error('Failed to parse data:', error);
			}
		} else {
			this.data = new Proxy({}, {
				get(target, prop) {
					return target[prop];
				},

				set(target, prop, value) {
					const result = (target[prop] = value);

					_this.save();

					return result;
				}
			});
		}
	}

	save() {
		const data = JSON.stringify(this.data, null, 2);

		writeFileSync(this.path, data, 'utf-8');
	}
}

export default new Store();