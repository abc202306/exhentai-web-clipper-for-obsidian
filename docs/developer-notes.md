
# Notes

- **1** [JavaScript](#javascript)
	- **1.1** [Function usage](#function-usage)
	- **1.2** [Code style](#code-style)
		- **1.2.1** [Variables & expressions](#variables--expressions) 
		- **1.2.2** [Orgazise code](#organize-code)
	- **1.3** [Logical correctnese](#logical-correctness)
		- **1.3.1** [Valid values](#valid-values)
		- **1.3.2** [Appropriate values](#appropriate-values)
- **2** [YAML & Obsidian conventions](#yaml--obsidian-conventions)
- **3** [Examples & transformation flow](#examples--transformation-flow)
- **4** [TODO / Edge cases](#todo--edge-cases)

## JavaScript

### Function usage

1. `Promise.resolve(value)` will "flatten" nested promises. Example:

```js
Promise.resolve(Promise.resolve(1)).then(console.log); // logs 1
```

2. Replacing strings:
	- Use `str.replace(/pattern/g, replacement)` when using a regex with the global flag.
	- `str.replaceAll(substring, replacement)` replaces all occurrences of the substring; when passing a regex to `replaceAll` the regex must be global.

Example:

```js
"aabaa".replace(/a/g, "b");     // => "bbbab"
"aabaa".replaceAll("a", "b"); // => "bbbab"
```

### Code style

#### Variables & expressions

1. Use the ternary operator (`cond ? a : b`) for concise conditional expressions, but prefer clarity when expressions become complex.
2. Use intermediate variables to improve readability and make debugging easier.
3. Use descriptive messages for errors and logging to reduce uncertainty when diagnosing problems.

#### Organize code

- Group related functions into classes or modules to keep responsibilities clear and make testing easier.

### Logical correctness

#### Valid values

- Guard against `null`/`undefined` before property access. Example:

```js
if (obj == null) return; // handles null and undefined
```

- Avoid duplicate values for metadata arrays. Use `Array.from(new Set(arr))` or `arr.filter((v,i)=>arr.indexOf(v)===i)` to deduplicate.

#### Appropriate values

- Remove falsy values from arrays when the array represents metadata keywords:

```js
const tags = rawTags.filter(Boolean);
```

- Sanitize titles for filenames. Remove or replace characters invalid in filenames (Windows example):

```js
const sanitized = title.replace(/[\\/:*?"<>|]/g, '').trim();
```

- Standardize wikilink text used in Obsidian: lowercase and replace spaces with dashes when appropriate for tags or slugs:

```js
const slug = text.toLowerCase().replace(/\s+/g, '-');
```

## YAML & Obsidian conventions

- Follow the existing frontmatter shape used by the project (see `README.md` for examples). Example frontmatter produced by the clipper:

```yaml
---
tagproperty01:
  - "[[tag-one]]"
  - "[[tag-two]]"
---
```

- Arrays are serialized as YAML lists (one item per line with `-`). Quote values when they contain special characters or pipes.

## Examples & transformation flow

- Typical flow: raw page value → normalize (trim, remove HTML) → sanitize (remove invalid filename chars) → normalize tags (lowercase, hyphenate) → dedupe → serialize to YAML.

Short example:

```js
// raw
const rawTags = ['Art', 'art', '', null, 'Sci Fi'];

// normalized
const tags = Array.from(new Set(rawTags
	.filter(Boolean)
	.map(t => t.toLowerCase().replace(/\s+/g, '-'))
));
// ['art', 'sci-fi']
```

## TODO / Edge cases

- Non-UTF8 or malformed titles: ensure UTF-8 normalization when reading page content.
- Tags with special characters: decide whether to escape, remove, or wrap as verbatim wikilinks.
