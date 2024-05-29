const REGEX = /&#([0-9]{1,3});/gi;

function parseHtmlEntities(content: string) {
	return content.replace(REGEX, (_, string) => {
		const number = parseInt(string, 10);

		return String.fromCharCode(number);
	});
}

export default parseHtmlEntities;