# Bible Study App

Read, discuss, reflect, and study the bible either privately or with a community.

## Features

### Rich Scripture Text

Comments and notes auto-link Bible references with hover previews and click-to-navigate.

**Supported reference formats:**

| Input | Result |
|---|---|
| `1 John 1:1` | Linked |
| `I John 1:1` | Linked |
| `1st John 1:1` | Linked |
| `John 1` | Linked (defaults to verse 1) |
| `john 1: 3 - 4` | Linked |
| `john 1:1 - John 1:10` | Two separate links |
| `Song of Solomon 1:1` | Linked |
| `1 Peter 1:1-5` | Displays as `1 Peter 1:1-5` |
| `II Corinthians 3:4` | Linked |
| `III John 1:5` | Linked |

- Ordinals: `1st`, `2nd`, `3rd` alongside `1`, `2`, `3` and `I`, `II`, `III`
- Optional verse: `John 1` matches and defaults to verse 1
- Flexible spacing around `:` and `-`
- Dot separator: `John 1.1`
- Em-dash and en-dash recognized
- Range display: shows full text like `1 Peter 1:1-5` when present
