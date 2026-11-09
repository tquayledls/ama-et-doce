# Summa Tab: Plan

Each day page has a third tab, **Summa**. It holds one article of St. Thomas Aquinas's *Summa Theologiae*, read in order from the first article (I, q.1, a.1) to the last. That includes the **Supplement** and both **Appendices**.

- **Length of the course:** 3,125 articles, one a day: Part I 584, I-II 619, II-II 917, III 549, Supplement 446, Appendix I 8, Appendix II 2. Starting on 2026-11-05, the last article falls on **2035-05-26**.
- **Order:** `saints/summa/INDEX.tsv` lists every article in sequence. Its columns are part, question, article, New Advent URL, question title, and article title, and its line number is the article's sequence number. The index was built from New Advent, one page per question.
- **History:** `SUMMA_LOG.md` has one row per day. The next article is the last logged sequence number + 1. Never skip or repeat an article.

## Each day
1. Choose the image (see below) and save it into `saints/images/<File_name>`, if Wikimedia rate-limits the download.
2. Write the article:
   `python3 saints/tools/summa_article.py --date <date> --image "<Commons file>" --image-title "<Title>" --image-artist "<Artist, date, location>"`
   This takes the next article after the log, writes `saints/summa/<date>-summa-<part>-q<q>-a<a>.html`, and prints the log row.
3. Run `python3 saints/tools/check_sources.py saints/summa/<file>.html`. Every line must say `ok`.
4. Pass the file to `build_page.py` with `--summa saints/summa/<file>.html`.
5. Add the row to `SUMMA_LOG.md`.
6. In the email, add one line linking to `…/days/<slug>.html#summa`.

## Text
The text is verbatim: the Fathers of the English Dominican Province translation, 2nd rev. ed., 1920, which is public domain. It is taken from New Advent with that site's encyclopedia links removed. Add no commentary, summary or headnote. The tab shows Thomas's article only, under its title and its Part, Question and Article.

## Image
- Use a **public-domain** artwork from Wikimedia Commons: PD-Art, PD-old, or CC0. Don't use CC-BY photos of paintings when a PD-Art copy exists.
- It should add beauty **and** point to the article's topic. Examples:
  - Raphael's *Theology* roundel, "Divinarum rerum notitia", for sacred doctrine
  - a Trinity for the Trinity questions
  - an Annunciation for the Incarnation
  - a Last Judgment for the Last Things
- No explanation of the image. The only text is a one-line caption (title, artist, date, place) with its footnote.
- An image may be reused across the articles of one question, but try to vary it when the topic shifts.

## Margin notes (Church Fathers and Summa tabs)
Old texts assume things a modern reader does not know, so each reading carries a few **margin notes**: short glosses that explain a name, a term, or what the author is saying.
- **Syntax:** in the source file, wrap the exact words in the text like this: `[[anchor words::the note]]`. The anchor stays in the text, underlined; the note appears in the right margin on wide screens and under the paragraph on narrow ones. The builder (`build_page.py`) turns the markers into notes. Put markers only inside `<p>` paragraphs before `<h3>Sources</h3>`. The anchor must occur in the text exactly, and the first occurrence in the file is the one annotated.
- **What to explain:** people and schools the reader may not know (Heraclitus of Ephesus, Basilides, the Manichæans), strange terms (usury, defluxion, "formality," "habit"), ancient or scholastic ideas the passage depends on (what "science" means for Aquinas, why a first principle can't be proved), and cryptic references (Aristotle is "the Philosopher").
- **How many:** a decent number but not overwhelming: about 5–10 per Fathers reading and 5–9 per Summa article, spread through the text. Skip anything a general reader already knows.
- **Wording:** 1–3 sentences, plain English, no more than about 45 words. Say only what you can stand behind. Explain; don't argue, and don't add opinion. The text itself stays verbatim; notes never change it.
- **Reader's switch:** every reading with notes shows a "Margin notes: on/off" button. Notes are on by default, and the choice is saved in the reader's browser for every page on the site.

