const test = require("node:test");
const assert = require("node:assert");
const {hashText, cleanMarkdownToPlainText} = require("../dist/domain/text.js");

test("hashText returns stable hex digest", () => {
        const expected = "429b9d1e";
        assert.strictEqual(hashText("Sample text"), expected);
        assert.strictEqual(hashText("Sample text").length, 8);
});

test("cleanMarkdownToPlainText removes frontmatter, links, and markdown", () => {
        const markdown = `---
        title: Example note
        tags: test
        ---

        This is a **bold** line with an [[Internal Link]] and [[Alias|custom text]].`;

        const cleaned = cleanMarkdownToPlainText(markdown);

        assert.strictEqual(
                cleaned,
                "This is a bold line with an Internal Link and Alias."
        );
});

test("convertMarkdownTableToText flattens tables to readable sentences", () => {
        const markdownTable = `| Name | Age | City |
| --- | --- | --- |
| Alice | 30 | Paris |
| Bob | 25 | London |`;

        const cleaned = cleanMarkdownToPlainText(markdownTable);

        assert.strictEqual(
                cleaned,
                "Name: Alice, Age: 30, City: Paris. Name: Bob, Age: 25, City: London"
        );
});
