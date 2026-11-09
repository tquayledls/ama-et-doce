/* Comments for Ama et Doce: highlight a passage and comment, plus a discussion thread per day.
   Needs <meta name="comments-api" content="https://..."> and <meta name="comments-day" content="slug">.
   Without them this script does nothing. All user text is inserted with textContent. */
(function () {
  "use strict";
  var apiMeta = document.querySelector('meta[name="comments-api"]');
  var dayMeta = document.querySelector('meta[name="comments-day"]');
  if (!apiMeta || !dayMeta || !apiMeta.content) return;
  var API = apiMeta.content.replace(/\/$/, ""), DAY = dayMeta.content;
  var SKEY = "amaetdoce-session", UKEY = "amaetdoce-user";
  var PANEL_LABEL = { saint: "Saint of the Day", fathers: "Church Fathers", summa: "Summa" };

  var session = null, me = null, comments = [], pop = null, floatBtn = null, dialog = null, section = null;
  try { session = localStorage.getItem(SKEY); me = JSON.parse(localStorage.getItem(UKEY) || "null"); } catch (e) {}
  if (!session) me = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---- API --------------------------------------------------------------------------------
  function api(method, path, body) {
    var headers = {};
    if (body) headers["Content-Type"] = "application/json";
    if (session) headers.Authorization = "Bearer " + session;
    return fetch(API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (data) {
          if (r.status === 401 && session) signOutLocal();
          if (!r.ok) throw new Error(data.error || "Something went wrong.");
          return data;
        });
      });
  }
  function signOutLocal() {
    session = null; me = null;
    try { localStorage.removeItem(SKEY); localStorage.removeItem(UKEY); } catch (e) {}
    renderAll();
  }
  function setSession(s, user) {
    session = s; me = user;
    try { localStorage.setItem(SKEY, s); localStorage.setItem(UKEY, JSON.stringify(user)); } catch (e) {}
  }
  function load() {
    return api("GET", "/api/comments?day=" + encodeURIComponent(DAY)).then(function (d) {
      comments = d.comments || []; renderAll();
    }).catch(function () { /* offline or service down: the page still reads fine */ });
  }

  // ---- text anchoring ----------------------------------------------------------------------
  var SKIP = ".mnotes, .cm-ui, script, style, .tabs, .site-nav";
  function textNodes(panel) {
    var out = [], w = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentElement && n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  function fullText(nodes) { return nodes.map(function (n) { return n.data; }).join(""); }

  function offsetOf(nodes, container, offset) {
    var pos = 0, i, n;
    if (container.nodeType === 3) {
      for (i = 0; i < nodes.length; i++) { if (nodes[i] === container) return pos + offset; pos += nodes[i].length; }
      return null;
    }
    var b = document.createRange(); b.setStart(container, offset); b.collapse(true);
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (b.comparePoint(n, 0) !== -1) return pos;
      pos += n.length;
    }
    return pos;
  }

  function findAnchor(text, c) {
    var q = c.quote, best = -1, bestScore = -1, i = text.indexOf(q);
    while (i !== -1) {
      var s = 0, p = c.prefix || "", x = c.suffix || "";
      while (s < p.length && text.charAt(i - 1 - s) === p.charAt(p.length - 1 - s)) s++;
      var t = 0;
      while (t < x.length && text.charAt(i + q.length + t) === x.charAt(t)) t++;
      if (s + t > bestScore) { bestScore = s + t; best = i; }
      i = text.indexOf(q, i + 1);
    }
    return best;
  }

  function clearMarks() {
    document.querySelectorAll("mark.cm-hl").forEach(function (m) {
      var p = m.parentNode;
      while (m.firstChild) p.insertBefore(m.firstChild, m);
      p.removeChild(m);
      p.normalize();
    });
  }
  function wrap(panel, start, end, id) {
    var nodes = textNodes(panel), pos = 0, segs = [];
    nodes.forEach(function (n) {
      var a = Math.max(start, pos), b = Math.min(end, pos + n.length);
      if (a < b) segs.push([n, a - pos, b - pos]);
      pos += n.length;
    });
    segs.forEach(function (s) {
      var r = document.createRange(), m = el("mark", "cm-hl");
      m.setAttribute("data-cm", id);
      r.setStart(s[0], s[1]); r.setEnd(s[0], s[2]);
      r.surroundContents(m);
    });
  }
  var placed = {};
  function applyMarks() {
    clearMarks(); placed = {};
    comments.forEach(function (c) {
      if (c.parent_id || c.deleted || !c.quote || !c.panel) return;
      var panel = document.getElementById(c.panel);
      if (!panel) return;
      var at = findAnchor(fullText(textNodes(panel)), c);
      if (at < 0) return;
      wrap(panel, at, at + c.quote.length, c.id);
      placed[c.id] = true;
    });
  }

  // ---- rendering ---------------------------------------------------------------------------
  function when(ts) {
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function composer(placeholder, onPost, btnText) {
    var f = el("form", "cm-form"), ta = el("textarea"), row = el("div", "row"), btn = el("button", "cm-btn", btnText || "Post"), err = el("p", "cm-err");
    ta.placeholder = placeholder; ta.maxLength = 2000; ta.required = true; ta.setAttribute("aria-label", placeholder);
    btn.type = "submit"; err.hidden = true;
    row.appendChild(btn); f.appendChild(ta); f.appendChild(row); f.appendChild(err);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      btn.disabled = true; err.hidden = true;
      onPost(ta.value).then(function () { ta.value = ""; }).catch(function (e) {
        err.textContent = e.message; err.hidden = false;
      }).then(function () { btn.disabled = false; });
    });
    return f;
  }
  function needSignIn(text) {
    var d = el("div", "cm-hint");
    d.appendChild(document.createTextNode(text + " "));
    var b = el("button", "cm-link", "Sign in or request access");
    b.type = "button"; b.addEventListener("click", function () { openDialog(); });
    d.appendChild(b);
    return d;
  }

  function post(extra, body) {
    var data = { day: DAY, panel: "", body: body };
    for (var k in extra) data[k] = extra[k];
    return api("POST", "/api/comments", data).then(load);
  }

  function renderComment(c) {
    var box = el("div", "cm-comment"), meta = el("div", "cm-meta");
    if (c.deleted) {
      box.appendChild(el("p", "cm-body cm-gone", "[deleted]"));
      return box;
    }
    meta.appendChild(el("b", null, c.name)); meta.appendChild(el("span", null, when(c.created_at)));
    box.appendChild(meta); box.appendChild(el("p", "cm-body", c.body));
    if (c.can_delete) {
      var acts = el("div", "cm-actions"), del = el("button", "cm-link", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        if (confirm("Delete this comment?")) api("DELETE", "/api/comments/" + c.id).then(load).catch(function (e) { alert(e.message); });
      });
      acts.appendChild(del); box.appendChild(acts);
    }
    return box;
  }

  function renderThread(root) {
    var t = el("div", "cm-thread"), replies = comments.filter(function (c) { return c.parent_id === root.id; });
    t.appendChild(renderComment(root));
    if (replies.length) {
      var r = el("div", "cm-replies");
      replies.forEach(function (c) { r.appendChild(renderComment(c)); });
      t.appendChild(r);
    }
    if (!root.deleted) {
      if (me) t.appendChild(composer("Reply…", function (body) { return post({ parent_id: root.id }, body); }, "Reply"));
      else t.appendChild(needSignIn("To reply,"));
    }
    return t;
  }

  function roots(filter) { return comments.filter(function (c) { return !c.parent_id && filter(c); }); }

  function authBar() {
    var bar = el("div", "cm-authbar");
    if (me) {
      bar.appendChild(el("span", null, "Signed in as " + me.name + "."));
      var out = el("button", "cm-link", "Sign out"); out.type = "button";
      out.addEventListener("click", function () { api("POST", "/api/logout").catch(function () {}).then(signOutLocal); });
      bar.appendChild(out);
    } else {
      var b = el("button", "cm-btn ghost", "Sign in or request access"); b.type = "button";
      b.addEventListener("click", function () { openDialog(); });
      bar.appendChild(b);
    }
    return bar;
  }

  function renderSection() {
    if (!section) {
      section = el("section", "cm-ui cm-section");
      section.id = "discussion";
      var foot = document.querySelector("footer.foot");
      if (foot) foot.parentNode.insertBefore(section, foot); else document.body.appendChild(section);
    }
    section.textContent = "";
    section.appendChild(el("h2", null, "Discussion"));
    section.appendChild(el("p", "cm-hint", "Select any passage above to comment on it, or join the day's discussion here. Names and comments are public; email addresses stay private and are used only to sign you in."));
    section.appendChild(authBar());
    if (me) section.appendChild(composer("Add to today's discussion…", function (body) { return post({}, body); }));

    var general = roots(function (c) { return !c.panel; });
    if (general.length) general.forEach(function (c) { section.appendChild(renderThread(c)); });
    else section.appendChild(el("p", "cm-hint", "No discussion yet."));

    var onText = roots(function (c) { return c.panel && c.quote; });
    if (onText.length) {
      section.appendChild(el("h3", null, "COMMENTS ON PASSAGES"));
      onText.forEach(function (c) {
        var box = el("div", "cm-passage"), q = el("blockquote", "cm-quote", "“" + c.quote + "”");
        q.title = placed[c.id] ? "Show in the text" : "";
        q.addEventListener("click", function () { jumpTo(c); });
        box.appendChild(el("div", "cm-meta", (PANEL_LABEL[c.panel] || c.panel) + (placed[c.id] ? "" : " · passage no longer found in the text")));
        box.appendChild(q); box.appendChild(renderThread(c));
        section.appendChild(box);
      });
    }
  }

  function jumpTo(c) {
    if (!placed[c.id]) return;
    if (location.hash.slice(1) !== c.panel && document.querySelector('.tabs [aria-controls="' + c.panel + '"]')) location.hash = "#" + c.panel;
    setTimeout(function () {
      var m = document.querySelector('mark[data-cm="' + c.id + '"]');
      if (m) { m.scrollIntoView({ block: "center" }); openThreadPop([c.id], m); }
    }, 50);
  }

  function renderAll() {
    applyMarks(); renderSection();
    if (pop && pop.ids) {
      var ids = pop.ids.filter(function (id) { return comments.some(function (c) { return c.id === id; }); });
      var m = ids.length && document.querySelector('mark[data-cm="' + ids[0] + '"]');
      if (m) openThreadPop(ids, m); else closePop();
    }
  }

  // ---- popovers ----------------------------------------------------------------------------
  function closePop() { if (pop) { pop.node.remove(); pop = null; } document.querySelectorAll("mark.cm-active").forEach(function (m) { m.classList.remove("cm-active"); }); }
  function place(node, rect) {
    var w = Math.min(384, window.innerWidth - 24);
    node.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - w - 12)) + "px";
    var below = rect.bottom + 8, h = node.offsetHeight;
    node.style.top = (below + h > window.innerHeight - 8 && rect.top - h - 8 > 8 ? rect.top - h - 8 : Math.max(8, below)) + "px";
  }
  function showPop(node, rect, ids) {
    closePop();
    var head = el("div", "cm-pop-head"), x = el("button", "cm-link", "Close");
    x.type = "button"; x.addEventListener("click", closePop);
    var wrapNode = el("div", "cm-ui cm-pop");
    wrapNode.setAttribute("role", "dialog");
    head.appendChild(x); wrapNode.appendChild(head); wrapNode.appendChild(node);
    document.body.appendChild(wrapNode);
    place(wrapNode, rect);
    pop = { node: wrapNode, ids: ids };
    var f = wrapNode.querySelector("textarea"); if (f) f.focus({ preventScroll: true });
  }
  function openThreadPop(ids, mark) {
    var box = el("div", "cm-thread");
    ids.forEach(function (id) {
      var c = comments.filter(function (x) { return x.id === id; })[0];
      if (c) { box.appendChild(el("blockquote", "cm-quote", "“" + c.quote + "”")); box.appendChild(renderThread(c)); }
    });
    showPop(box, mark.getClientRects()[0] || mark.getBoundingClientRect(), ids);
    document.querySelectorAll('mark.cm-hl').forEach(function (m) { m.classList.toggle("cm-active", ids.indexOf(+m.getAttribute("data-cm")) !== -1); });
  }
  function openComposePop(sel) {
    var box = el("div", "cm-thread");
    box.appendChild(el("blockquote", "cm-quote", "“" + sel.quote + "”"));
    if (me) {
      box.appendChild(composer("Your comment on this passage…", function (body) {
        return post({ panel: sel.panel, quote: sel.quote, prefix: sel.prefix, suffix: sel.suffix }, body).then(closePop);
      }));
    } else box.appendChild(needSignIn("To comment,"));
    showPop(box, sel.rect, null);
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!(t instanceof Element)) return;
    var m = t.closest("mark.cm-hl");
    if (m) {
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      var ids = [], n = m;
      while (n) { if (n.matches && n.matches("mark.cm-hl")) ids.push(+n.getAttribute("data-cm")); n = n.parentElement; }
      openThreadPop(ids, m);
      return;
    }
    if (pop && !t.closest(".cm-pop") && !t.closest(".cm-float")) closePop();
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { closePop(); hideFloat(); } });

  // ---- selecting text ----------------------------------------------------------------------
  var pendingSel = null, selTimer = null;
  function hideFloat() { if (floatBtn) { floatBtn.remove(); floatBtn = null; } pendingSel = null; }
  function readSelection() {
    var s = window.getSelection();
    if (!s || s.rangeCount === 0 || s.isCollapsed) return null;
    var r = s.getRangeAt(0), a = r.commonAncestorContainer;
    var host = a.nodeType === 1 ? a : a.parentElement;
    if (!host || host.closest(".cm-ui")) return null;
    var panel = host.closest(".tabpanel");
    if (!panel || !panel.id || !PANEL_LABEL[panel.id] || panel.hidden) return null;
    var nodes = textNodes(panel), text = fullText(nodes);
    var start = offsetOf(nodes, r.startContainer, r.startOffset), end = offsetOf(nodes, r.endContainer, r.endOffset);
    if (start == null || end == null || end <= start) return null;
    while (start < end && /\s/.test(text.charAt(start))) start++;
    while (end > start && /\s/.test(text.charAt(end - 1))) end--;
    if (end - start < 3) return null;
    if (end - start > 400) end = start + 400;
    var rects = r.getClientRects(), rect = rects.length ? rects[rects.length - 1] : r.getBoundingClientRect();
    return { panel: panel.id, quote: text.slice(start, end), prefix: text.slice(Math.max(0, start - 40), start), suffix: text.slice(end, end + 40),
             rect: { left: rect.left, top: rect.top, bottom: rect.bottom } };
  }
  function onSelect() {
    clearTimeout(selTimer);
    selTimer = setTimeout(function () {
      var sel = readSelection();
      if (!sel) { if (!floatBtn || !floatBtn.matches(":hover, :focus")) hideFloat(); return; }
      hideFloat();
      pendingSel = sel;
      floatBtn = el("button", "cm-ui cm-btn cm-float", "💬 Comment");
      floatBtn.type = "button";
      floatBtn.addEventListener("mousedown", function (e) { e.preventDefault(); });
      floatBtn.addEventListener("click", function () { var s = pendingSel; hideFloat(); if (s) openComposePop(s); });
      document.body.appendChild(floatBtn);
      var w = floatBtn.offsetWidth;
      floatBtn.style.left = Math.max(8, Math.min(sel.rect.left, window.innerWidth - w - 8)) + "px";
      floatBtn.style.top = Math.min(sel.rect.bottom + 8, window.innerHeight - 48) + "px";
    }, 180);
  }
  document.addEventListener("selectionchange", onSelect);
  window.addEventListener("scroll", function () { if (floatBtn) hideFloat(); }, { passive: true });

  // ---- sign in / request access dialog ----------------------------------------------------
  function openDialog() {
    closePop(); hideFloat();
    if (!dialog) {
      dialog = el("dialog", "cm-ui cm-dialog");
      document.body.appendChild(dialog);
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    }
    dialog.textContent = "";
    var mode = "signin";
    var h = el("h2", null, "Join the discussion"), tabs = el("div", "cm-tabs"), body = el("div");
    var t1 = el("button", null, "Sign in"), t2 = el("button", null, "Request access");
    t1.type = t2.type = "button"; t1.setAttribute("role", "tab"); t2.setAttribute("role", "tab");
    tabs.appendChild(t1); tabs.appendChild(t2);
    function draw() {
      t1.setAttribute("aria-selected", mode === "signin"); t2.setAttribute("aria-selected", mode !== "signin");
      body.textContent = "";
      var f = el("form", "cm-form"), msg = el("p", "cm-ok"), err = el("p", "cm-err"), btn = el("button", "cm-btn", mode === "signin" ? "Email me a sign-in link" : "Request access");
      btn.type = "submit"; msg.hidden = err.hidden = true;
      var name = null;
      if (mode !== "signin") {
        var ln = el("label", null, "Your name (shown with your comments)"); name = el("input"); name.required = true; name.maxLength = 80; name.autocomplete = "name"; ln.appendChild(name); f.appendChild(ln);
      }
      var le = el("label", null, "Email (kept private)"), email = el("input"); email.type = "email"; email.required = true; email.maxLength = 120; email.autocomplete = "email"; le.appendChild(email);
      f.appendChild(le);
      if (mode !== "signin") f.appendChild(el("p", "cm-hint", "New accounts are approved by hand. You'll get an email when yours is."));
      var row = el("div", "row"), close = el("button", "cm-btn ghost", "Close"); close.type = "button"; close.addEventListener("click", function () { dialog.close(); });
      row.appendChild(btn); row.appendChild(close); f.appendChild(row); f.appendChild(msg); f.appendChild(err);
      f.addEventListener("submit", function (ev) {
        ev.preventDefault(); btn.disabled = true; err.hidden = msg.hidden = true;
        var req = mode === "signin" ? api("POST", "/api/login", { email: email.value }) : api("POST", "/api/request-access", { name: name.value, email: email.value });
        req.then(function (d) { msg.textContent = d.message; msg.hidden = false; })
           .catch(function (e) { err.textContent = e.message; err.hidden = false; })
           .then(function () { btn.disabled = false; });
      });
      body.appendChild(f);
    }
    t1.addEventListener("click", function () { mode = "signin"; draw(); });
    t2.addEventListener("click", function () { mode = "request"; draw(); });
    dialog.appendChild(h); dialog.appendChild(tabs); dialog.appendChild(body);
    draw();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
  }

  // ---- magic-link sign-in: #login=TOKEN ----------------------------------------------------
  function handleLoginHash() {
    var m = location.hash.match(/^#login=([a-f0-9]{64})$/);
    if (!m) return Promise.resolve();
    history.replaceState(null, "", location.pathname + location.search);   // keep the token out of history and referrers
    return api("POST", "/api/verify", { token: m[1] }).then(function (d) {
      setSession(d.session, d.user);
      notice("Signed in. You can now comment.");
    }).catch(function (e) { notice(e.message, true); });
  }
  function notice(text, bad) {
    var n = el("div", "cm-ui cm-float", text);
    n.style.cssText = "left:50%;top:16px;transform:translateX(-50%);padding:.6rem 1rem;border-radius:6px;background:var(--surface);border:1px solid var(--rule);border-top:3px solid " + (bad ? "#B3261E" : "var(--gilt)");
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 6000);
  }

  function start() {
    handleLoginHash().then(function () {
      if (session && !me) return api("GET", "/api/me").then(function (d) { if (d.user) setSession(session, d.user); });
    }).catch(function () {}).then(load);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.addEventListener("resize", function () { if (pop && pop.ids) renderAll(); });
})();
