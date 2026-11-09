# Church Fathers Tab: Plan

Each day's page has a second tab, **Church Fathers**. It holds one long reading on a topic, either one long passage from one Father or a chain of 2–4 Fathers on the same topic. The topics follow the syllabus below, in order, and have nothing to do with the day's saint.

The running history is in `FATHERS_LOG.md`, which lives in the repo and never appears on the page. Check it every day so that no topic and no passage is ever used twice.

## Rules
1. **Topic:** use the next unchecked topic in the syllabus. If none of its candidate texts can be found and verified, move to the next topic and come back to it later. Check off a topic (✅) when it is used.
2. **Never repeat a writing.** Before choosing a passage, look up the work and its chapters in `FATHERS_LOG.md`. Don't use any chapter or section that is already logged. Other parts of the same work are fine.
3. **Length:** a 5–10 minute read, about **1,200–2,400 words** of excerpt. The page shows the reading time it calculates (230 words a minute).
4. **Format:**
   - Use one Father when a single work treats the topic fully.
   - Otherwise use a chain of 2–4 Fathers, each passage under its own heading.
   - The text is the Fathers' own words, quoted **verbatim**.
   - Cuts inside a passage are marked "…".
   - Bracket any editorial insertion, e.g. a Scripture reference: `[Job 9:9]`.
   - No commentary of our own beyond the headnote.
5. **Headnote:** 1–3 sentences before the excerpt: who wrote it, when, and the occasion. It is footnoted like everything else, and no claim may rest only on Wikipedia.
6. **Translations:** use **public-domain translations only**, because the excerpts are long:
   - the *Ante-Nicene Fathers* (ANF)
   - the *Nicene and Post-Nicene Fathers*, Series 1 and 2 (NPNF1, NPNF2)
   - other translations published before 1930
   
   Quote from New Advent (newadvent.org/fathers), which carries ANF and NPNF and supports text-fragment links. Never quote a modern copyrighted translation at length.
7. **Footnotes:**
   - There is one note per passage. In a long excerpt, give a note at the end of each chapter or section, linking to that chapter's first words with a text fragment.
   - Each note cites the Father, the work, the book or chapter, and the translator and volume, e.g. "trans. Marcus Dods, in *Ante-Nicene Fathers*, vol. 2 (1885)".
   - Notes are numbered separately from the saint's notes, starting at 1.
   - Run `python3 saints/tools/check_sources.py saints/fathers/<file>.html`. Every line must say `ok`.
8. **Email:** add one line under the page link that names the topic and links to `…/days/<slug>.html#fathers`.

## File format: `saints/fathers/<date>-<topic-slug>.html`
```html
<h2>Topic title</h2>
<p><em>St. Father, <cite>Work</cite>, Book, chapters</em></p>   <!-- byline; for a chain, list each Father -->
<p>Headnote …[1]</p>
<h3>St. Father · Work I.2–8</h3>            <!-- one <h3> per excerpt -->
<h4>Chapter 2. Chapter title</h4>          <!-- optional chapter heads -->
<p>Verbatim text …[2]</p>
<h3>Sources</h3>
<ol><li>Author, <em>Work</em>, ch., trans., vol. (year). <a href="…#:~:text=…">…</a></li></ol>
```
Build the day page with `build_page.py … --fathers saints/fathers/<file>.html`. The builder adds the tab, the reading time, and footnote links (anchors `ffn-n`). The tab opens directly at `…/days/<slug>.html#fathers`.

## Syllabus
It follows the order of the Catechism: the Creed, the sacraments, life in Christ, prayer. The texts listed are candidates, not commitments. Verify them on New Advent first and check the log.

### I. The Profession of Faith
1. ✅ Knowing God through His works: Theophilus, *To Autolycus* I.2–8
2. ✅ The restless heart: man's longing for God: Augustine, *Confessions* I.1–5; X.6–27
3. ✅ Faith and reason: Clement of Alexandria, *Stromata* II.2–6; Augustine, Letter 120
4. The one God against the many gods: Athanasius, *Against the Heathen* 35–47
5. Scripture, given by God: Irenaeus, *Against Heresies* II.28; Augustine, *Confessions* XII
6. Apostolic Tradition and succession: Irenaeus, *Against Heresies* III.1–4; Tertullian, *Prescription against Heretics* 20–32
7. Reading Scripture: Augustine, *On Christian Doctrine* II–III (selections)
8. The Holy Trinity: Gregory Nazianzen, *Oration* 31 (Fifth Theological Oration)
9. God the Father Almighty: Cyril of Jerusalem, *Catechetical Lectures* 6–8
10. Creation out of nothing: Basil, *Hexaemeron* Homily 1; Athanasius, *On the Incarnation* 2–3
11. The angels: Gregory the Great, *Homily* 34 on the Gospels (if a PD translation exists); John Damascene, *Exact Exposition* II.3
12. Man made in God's image: Gregory of Nyssa, *On the Making of Man* 4–5, 16
13. The Fall and original sin: Augustine, *City of God* XIV.11–15
14. Why is there evil?: Augustine, *Enchiridion* 10–16; *Confessions* VII.3–16
15. Why God became man: Athanasius, *On the Incarnation* 6–10
16. True God and true man: Leo the Great, *Tome* (Letter 28)
17. One Christ: Cyril of Alexandria, Second Letter to Nestorius; Gregory Nazianzen, Letter 101
18. Mary, the New Eve and Mother of God: Irenaeus, *Against Heresies* III.22, V.19; Council of Ephesus
19. Mary ever-virgin: Jerome, *Against Helvidius*
20. The Word made flesh, at Christmas: Gregory Nazianzen, *Oration* 38; Leo, *Sermons* on the Nativity
21. The Epiphany and the Baptism of the Lord: Gregory Nazianzen, *Oration* 39; Leo, *Sermons* on the Epiphany
22. The Cross: Cyril of Jerusalem, *Catechetical Lecture* 13
23. The Descent into hell: Cyril of Jerusalem, *Catechetical Lecture* 14 (selections)
24. The Resurrection of Christ: Athanasius, *On the Incarnation* 26–32
25. The Ascension: Leo the Great, *Sermons* 73–74
26. The Holy Spirit: Basil, *On the Holy Spirit* 9; Cyril of Jerusalem, *Catechetical Lecture* 16
27. The Church, the Body of Christ: Augustine, *Homilies on 1 John* (selections)
28. One Church: Cyprian, *On the Unity of the Church*
29. Peter and his successors: Leo the Great, *Sermons* 3–4; Cyprian, Letter 54 (ANF numbering)
30. Catholic: what the name means: Cyril of Jerusalem, *Catechetical Lecture* 18.22–28; Augustine, *Against the Epistle of Manichaeus* 4–5
31. Holding the faith handed down: Vincent of Lérins, *Commonitory* 2–6, 23
32. The communion of saints: Cyril of Jerusalem, *Mystagogical Catechesis* 5.8–10; Augustine, *City of God* XXII.8–10
33. The forgiveness of sins: Augustine, *Enchiridion* 64–83
34. The resurrection of the body: Athenagoras, *On the Resurrection of the Dead*; Tertullian, *On the Resurrection of the Flesh*
35. Death: Cyprian, *On Mortality*
36. The Judgment: Cyril of Jerusalem, *Catechetical Lecture* 15
37. Heaven and the vision of God: Augustine, *City of God* XXII.29–30
38. Hell: Augustine, *City of God* XXI (selections)
39. Prayer for the dead: Augustine, *Confessions* IX.10–13; *On the Care to Be Had for the Dead*

### II. The Celebration of the Christian Mystery
40. Christian worship in the second century: Justin Martyr, *First Apology* 61–67; *Didache* 7–14
41. Baptism: Cyril of Jerusalem, *Mystagogical Catecheses* 1–2; Tertullian, *On Baptism*
42. Confirmation, the seal of the Spirit: Cyril of Jerusalem, *Mystagogical Catechesis* 3; Ambrose, *On the Mysteries* 7
43. The Eucharist: the Body and Blood of Christ: Cyril of Jerusalem, *Mystagogical Catechesis* 4; Ambrose, *On the Mysteries* 8–9
44. The Eucharist as sacrifice: Cyril of Jerusalem, *Mystagogical Catechesis* 5; Chrysostom, *Homilies on Hebrews* 17; Augustine, *City of God* X.5–6, 20
45. Worthy reception of Communion: Chrysostom, *Homilies on 1 Corinthians* 27–28
46. Penance and confession: Ambrose, *On Repentance*; Cyprian, *On the Lapsed* 28–36
47. Anointing and the care of the sick: Chrysostom, *On the Priesthood* III; Polycarp, *Letter to the Philippians* 6
48. The priesthood: Chrysostom, *On the Priesthood* III–IV; Gregory Nazianzen, *Oration* 2
49. Marriage: Tertullian, *To His Wife* II.8; Chrysostom, *Homily* 20 on Ephesians
50. Virginity for the Kingdom: Ambrose, *On Virgins* I–II; Athanasius, *Life of Antony* 1–14
51. The Lord's Day: Ignatius, *Magnesians* 9; Justin, *First Apology* 67; *Didache* 14
52. Feasts and fasts of the Church year: Leo the Great, *Sermons* on Lent (39–50)

### III. Life in Christ
53. Our destiny: happiness in God: Augustine, *City of God* XIX.4–20; *Confessions* X.20–23
54. Grace and free will: Augustine, *On Grace and Free Will*
55. Conscience and the natural law: Augustine, *Confessions* II.4–10; Tertullian, *The Soul's Testimony*
56. Love of God and neighbor: Augustine, *Homilies on 1 John* 7–8
57. Humility: Augustine, *Sermons on the New Testament* (selections); Cassian, *Institutes* XII
58. Patience: Cyprian, *On the Advantage of Patience*; Tertullian, *Of Patience*
59. Envy: Cyprian, *On Jealousy and Envy*
60. Almsgiving: Cyprian, *On Works and Alms*; Chrysostom, *Homily* 50 on Matthew
61. Wealth and the rich man: Clement of Alexandria, *Who Is the Rich Man That Shall Be Saved?*
62. Fasting: Leo the Great, *Sermons* on the Fast of the Tenth Month; Chrysostom, *Homilies on the Statues* 3
63. Anger and forgiving injuries: Chrysostom, *Homilies on Matthew* 18–19 (selections)
64. Truthfulness: Augustine, *On Lying*
65. Chastity and purity of heart: Cassian, *Institutes* VI; Augustine, *Confessions* VIII.5–12
66. The spiritual combat: Athanasius, *Life of Antony* 21–43; Cassian, *Institutes* V
67. Christians in the world: *Letter to Diognetus* 5–7
68. Martyrdom: Ignatius, *Letter to the Romans*; *Martyrdom of Polycarp*
69. Work and rest: Basil, *Long Rules* 37 (if a PD translation exists); Augustine, *On the Work of Monks*
70. Friendship: Augustine, *Confessions* IV.4–9; Ambrose, *On the Duties of the Clergy* III.21–22

### IV. Christian Prayer
71. What prayer is: Tertullian, *On Prayer*; Clement of Alexandria, *Stromata* VII.7
72. The Our Father: Cyprian, *On the Lord's Prayer*
73. The Our Father, continued: Cyril of Jerusalem, *Mystagogical Catechesis* 5.11–18; Augustine, *Sermon on the Mount* II.4–11
74. Praying the Psalms: Augustine, *Expositions on the Psalms* (selections); Basil, *Homily on Psalm 1*
75. Pray without ceasing: Cassian, *Conferences* IX–X
76. Asking of God: Augustine, Letter 130 to Proba
77. Thanksgiving: Chrysostom, *Homilies on Ephesians* 19; *Homilies on Colossians* 10
78. Watchfulness and the hour of death: Cyprian, *On Mortality* (sections not used for topic 35); Augustine, *Confessions* IX.10

After topic 78, start a second cycle on the same headings, using passages not yet logged.

## Margin notes (Church Fathers and Summa tabs)
Old texts assume things a modern reader does not know, so each reading carries a few **margin notes**: short glosses that explain a name, a term, or what the author is saying.
- **Syntax:** in the source file, wrap the exact words in the text like this: `[[anchor words::the note]]`. The anchor stays in the text, underlined; the note appears in the right margin on wide screens and under the paragraph on narrow ones. The builder (`build_page.py`) turns the markers into notes. Put markers only inside `<p>` paragraphs before `<h3>Sources</h3>`. The anchor must occur in the text exactly, and the first occurrence in the file is the one annotated.
- **What to explain:** people and schools the reader may not know (Heraclitus of Ephesus, Basilides, the Manichæans), strange terms (usury, defluxion, "formality," "habit"), ancient or scholastic ideas the passage depends on (what "science" means for Aquinas, why a first principle can't be proved), and cryptic references (Aristotle is "the Philosopher").
- **How many:** a decent number but not overwhelming: about 5–10 per Fathers reading and 5–9 per Summa article, spread through the text. Skip anything a general reader already knows.
- **Wording:** 1–3 sentences, plain English, no more than about 45 words. Say only what you can stand behind. Explain; don't argue, and don't add opinion. The text itself stays verbatim; notes never change it.
- **Reader's switch:** every reading with notes shows a "Margin notes: on/off" button. Notes are on by default, and the choice is saved in the reader's browser for every page on the site.

