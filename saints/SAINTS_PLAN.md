# Saint of the Day — Plan

**Recipients:** set in the scheduled routine's prompt, not stored in this repository (sent with Outlook, through the Microsoft 365 connector)
**Schedule:** every day at about 5:00 AM Eastern (the routine starts at 4:50 AM so the email is ready by 5)
**Started:** 2026-11-01, Solemnity of All Saints

## How to choose the saint
1. **Today's saint first.** If a saint has a feast or memorial today (General Roman Calendar, U.S. proper), and is not already in `SAINTS_LOG.md`, choose them.
2. **Feasts with no single saint** (All Souls, Marian feasts, Sundays, Advent/Lent weekdays): choose a saint linked to that feast (e.g. All Souls → St. Odilo of Cluny), or a saint from the *Open-day pool*.
3. **Never repeat.** Every name in `SAINTS_LOG.md` is off limits.
4. **Variety.** Mix eras (Apostolic, Patristic, Medieval, Modern), regions, and states of life (martyrs, religious, clergy, laity, married, young).
5. Don't use a pool saint on an open day if their own feast is less than 30 days away. Save them for that day.

## Required sections in each email
1. Name (and titles, e.g. Doctor of the Church, Martyr)
2. Origin (birthplace and region, background)
3. Painting or image: a Wikimedia Commons painting or icon, with artist and title. Outlook can't show images in the email, so each day also gets a **web page** (a private claude.ai artifact) with the painting shown. The email opens with a link to that page
4. Born (date, or "c." if approximate)
5. Died (date, place, and how)
6. A famous excerpt *by* or *about* the saint, with its source
7. How their life serves:
   1. **Catechesis**
   2. **Apologetics**
   3. **Theology**
   4. **Devotional prayer**. Use ONLY prayers from the Church's treasury, quoted exactly and with their source: the saint's Collect from the Roman Missal, Liturgy of the Hours texts, approved litanies or novenas, traditional prayers (Memorare, Anima Christi, etc.), or prayers the saint wrote. **Never write an original prayer.** If no approved prayer can be verified, suggest lectio divina on the saint's own words or a traditional prayer instead
8. Feast day, and a one-line "today's takeaway"
9. **Sources (footnotes), one note per passage.** Every fact, date, quotation, prayer, and image gets a numbered note. In the email the marker is plain text `[n]`, since Outlook strips `<sup>`. Each note cites ONE specific passage, so a source used for three facts gets three notes. Reuse a number only for the identical passage. End the email with `<h3>Sources</h3><ol>…</ol>`, one `<li>` per note in order: author, *title*, location (chapter, no., or topic), and a link that **lands on the passage**:
   - **Web pages:** add a text fragment, `URL#:~:text=<exact phrase>`. Build it with `python3 saints/tools/check_sources.py --link URL "exact phrase"`. Copy the phrase from the page's own wording, 3–10 words, all inside one paragraph.
   - **PDFs:** `URL#page=N`.
   - **archive.org scans:** `https://archive.org/details/<id>/page/n<N>/mode/1up?q=%22<phrase>%22`.
   - **Sites where fragments don't work:** ccel.org (use ewtn.com/catholicism/library for the same texts) and archive.org `stream/…djvu.txt` pages.
   - Run `python3 saints/tools/renumber_notes.py <entry> <print notes>` so the notes run in reading order.
   - Run `python3 saints/tools/check_sources.py <entry>` before sending. Every line must say `ok`.
   - Prefer primary and Church sources (vatican.va, the Roman Missal, the Liturgy of the Hours, the saint's own writings, the Catholic Encyclopedia at newadvent.org).
   - Cut any claim you can't source. Where sources disagree, say so and cite each.
   - On the web page, the builder turns markers into superscript links and adds ↩ back-links.

## Church Fathers tab
Each day page also has a **Church Fathers** tab: a 5–10 minute reading from one or more Fathers, on the next topic in a fixed syllabus that is independent of the saint. The rules, the file format and the syllabus are in `FATHERS_PLAN.md`. The running history of topics and passages is in `FATHERS_LOG.md`, which is never shown on the page. Write `saints/fathers/<date>-<topic-slug>.html`, check it with `check_sources.py`, and pass it to `build_page.py --fathers`. If the file for today already exists (prepared in advance), use it.

## Summa tab
Each day page also has a **Summa** tab: the next article of the *Summa Theologiae*, in order from I, q.1, a.1 through the Supplement and Appendices, with a public-domain image that fits the topic. The rules are in `SUMMA_PLAN.md` and the history is in `SUMMA_LOG.md`. Generate the file with `saints/tools/summa_article.py` and pass it to `build_page.py --summa`.

## Website (GitHub Pages)
- **Hosting:** GitHub Pages publishes the folder `saints/site` whenever the `daily` branch is pushed. `.github/workflows/pages.yml` does this, and there is no build step. Every push to `daily` redeploys the site in about a minute.
- **Pages:**
  - `index.html`: today's saint, with an archive of all saints
  - `days/<slug>.html`: one page per day
  - `print/<slug>.pdf`: the pocket edition for each day
  - `404.html`: page not found
- **Site URL:** https://tquayledls.github.io/ama-et-doce/. Each email links to that day's own page, `https://tquayledls.github.io/ama-et-doce/days/<slug>.html`, which never changes. The home page always shows the newest saint.
- **Each day:**
  1. Build the day page with `python3 saints/tools/build_page.py … --fathers saints/fathers/<file>.html --summa saints/summa/<file>.html` (to `saints/pages/`) and the PDF with `build_print.py` (to `saints/print/`).
  2. Add the log row.
  3. Run `python3 saints/tools/build_site.py`. It rebuilds `saints/site/` (index, days, PDFs) and `saints/artifact/index.html`.
  4. Commit and push. That deploys the site.
- The claude.ai shared page is retired. Do not publish artifacts for new days.

## Pocket print edition (4 × 6 in PDF)
- Write `saints/print/YYYY-MM-DD-<slug>.notes.html`: an `<ol>` with one `<li>` per footnote number in the entry, in the same order. Each one is the WRITTEN citation only, with no web addresses, in Chicago note style: author, *title*, edition and publisher or date, then chapter, section, no., or page. After the full form add ` || ` and a short form to use on later citations, for example `Gildas, "St. Bernard of Clairvaux."`. The builder adds "Ibid." for back-to-back repeats.
- Cite the underlying written work, not the website. Examples: the Office of Readings and its Latin edition, not the site that posted it; the Roman Missal, not a parish page; Dante's *Paradiso*, not Wikipedia.
- Build with `python3 saints/tools/build_print.py` (same metadata flags as the page builder, plus `--notes` and `--out saints/print/YYYY-MM-DD-<slug>.pdf`). It sets real footnotes at the foot of each page, with the painting on the title page and red rubrics.

Email: under the page link, add `<p>From the Church Fathers: <a href="https://tquayledls.github.io/ama-et-doce/days/<slug>.html#fathers"><Topic></a> (<Father(s)>, about N min)</p>`.

Then add `<p>Summa Theologiae: <a href="https://tquayledls.github.io/ama-et-doce/days/<slug>.html#summa"><Article title></a> (<I, q.1, a.1>)</p>`.

Subject line format: `Saint of the Day — <Month D>: <Saint Name>`

## Draft calendar (adjust as needed)
| Date | Planned saint | Note |
|------|---------------|------|
| Nov 1 | St. Bernard of Clairvaux | All Saints. Bernard's All Saints sermon ✅ |
| Nov 2 | St. Odilo of Cluny | All Souls. Odilo set up the commemoration (after 1030, per the Catholic Encyclopedia) ✅ |
| Nov 3 | St. Martin de Porres | Memorial ✅ |
| Nov 4 | St. Charles Borromeo | Memorial ✅ |
| Nov 5 | St. Irenaeus of Lyons | Open day ✅ |
| Nov 6 | St. Justin Martyr | Open day |
| Nov 7 | St. Willibrord | Traditional feast |
| Nov 8 | St. Elizabeth of the Trinity | Feast |
| Nov 9 | St. Athanasius | Lateran Basilica dedication. Open day |
| Nov 10 | St. Leo the Great | Memorial |
| Nov 11 | St. Martin of Tours | Memorial |
| Nov 12 | St. Josaphat | Memorial |
| Nov 13 | St. Frances Xavier Cabrini | Memorial (U.S.) |
| Nov 14 | St. John Henry Newman | Open day |
| Nov 15 | St. Albert the Great | Optional memorial |
| Nov 16 | St. Gertrude the Great | Optional memorial |
| Nov 17 | St. Elizabeth of Hungary | Memorial |
| Nov 18 | St. Rose Philippine Duchesne | Optional memorial (U.S.) |
| Nov 19 | St. Thomas Aquinas | Open day |
| Nov 20 | St. Robert Bellarmine | Open day |
| Nov 21 | St. Anne | Presentation of Mary |
| Nov 22 | St. Cecilia | Memorial |
| Nov 23 | St. Columban | Optional memorial |
| Nov 24 | St. Andrew Dung-Lac | Memorial |
| Nov 25 | St. Catherine of Alexandria | Optional memorial |
| Nov 26 | St. Augustine of Hippo | Thanksgiving (U.S.). Open day |
| Nov 27 | St. Thomas More | Open day |
| Nov 28 | St. Catherine of Siena | Open day |
| Nov 29 | St. John the Baptist | First Sunday of Advent |
| Nov 30 | St. Andrew the Apostle | Feast |
| Dec 1 | St. Edmund Campion | Apologist and martyr |
| Dec 2 | St. Cyril of Jerusalem | Open day (catechetical lectures) |
| Dec 3 | St. Francis Xavier | Memorial |
| Dec 4 | St. John Damascene | Optional memorial |
| Dec 5 | St. Sabbas | Traditional feast |
| Dec 6 | St. Nicholas | Optional memorial |
| Dec 7 | St. Ambrose | Memorial |
| Dec 8 | St. Bernadette Soubirous | Immaculate Conception ("I am the Immaculate Conception") |
| Dec 9 | St. Juan Diego | Optional memorial |
| Dec 10 | St. Hilary of Poitiers | Open day |
| Dec 11 | St. Damasus I | Optional memorial |
| Dec 12 | St. Kateri Tekakwitha | Our Lady of Guadalupe (Patroness of the Americas) |
| Dec 13 | St. Lucy | Memorial |
| Dec 14 | St. John of the Cross | Memorial |
| After Dec 14 | Follow the rules above | Extend this table when it runs low |

## Open-day pool (use when the day has no unused saint)
Ignatius of Antioch, Polycarp, Clement of Rome, Cyprian, Hilary of Poitiers, Basil the Great, Gregory Nazianzen, Gregory of Nyssa*, John Chrysostom, Jerome, Ephrem, Benedict, Scholastica, Gregory the Great, Bede, Anselm, Dominic, Francis of Assisi, Clare, Anthony of Padua, Bonaventure, Teresa of Ávila, Ignatius of Loyola, Francis de Sales, Philip Neri, Vincent de Paul, Alphonsus Liguori, Louis de Montfort, Thérèse of Lisieux, Bernadette, Faustina, Maximilian Kolbe, Teresa Benedicta of the Cross (Edith Stein), Pio of Pietrelcina, Josemaría Escrivá, John Paul II, Gianna Beretta Molla, Pier Giorgio Frassati, Carlo Acutis, Louis & Zélie Martin, Elizabeth Ann Seton, John Neumann, Katharine Drexel, Damien of Molokai, Junípero Serra, Isaac Jogues, Paul Miki, Charles Lwanga, Josephine Bakhita, Rose of Lima, Kateri Tekakwitha, Thomas Becket, John Fisher, Joan of Arc, Monica, Patrick, Boniface, Cyril & Methodius.
(*Gregory of Nyssa is venerated as a saint, though he has no memorial on the Roman calendar.)
