#!/usr/bin/env python3
import json
import os
import subprocess
import time
import urllib.request
import base64

import websocket

PORT = 9223
BROWSER = subprocess.Popen(
    [
        "/usr/bin/chromium",
        "--headless=new",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=*",
        "--window-size=390,844",
        "about:blank",
    ],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

seq = 0
ws = None


def command(method, params=None):
    global seq
    seq += 1
    ws.send(json.dumps({"id": seq, "method": method, "params": params or {}}))
    while True:
        message = json.loads(ws.recv())
        if message.get("id") == seq:
            if "error" in message:
                raise RuntimeError(message["error"])
            return message.get("result", {})


def evaluate(expression):
    result = command("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
    if "exceptionDetails" in result:
        raise RuntimeError({"expression": expression, "exception": result["exceptionDetails"]})
    return result.get("result", {}).get("value")


def wait_for(expression, timeout=12):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if evaluate(f"Boolean({expression})"):
            return
        time.sleep(0.2)
    raise TimeoutError(expression)


try:
    deadline = time.time() + 15
    target = None
    while time.time() < deadline:
        try:
            targets = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=1))
            target = next((item for item in targets if item.get("type") == "page"), None)
            if target:
                break
        except Exception:
            time.sleep(0.2)
    if not target:
        raise RuntimeError("Chromium DevTools target did not start")

    ws = websocket.create_connection(target["webSocketDebuggerUrl"], timeout=15)
    command("Page.enable")
    command("Runtime.enable")
    command("Emulation.setDeviceMetricsOverride", {"width": 390, "height": 844, "deviceScaleFactor": 2, "mobile": True})
    command("Page.navigate", {"url": "http://127.0.0.1:3000/en/chapters/01-shiji"})
    wait_for("document.readyState === 'complete' && document.querySelector('h1') && document.querySelector('[role=progressbar]')")
    evaluate("localStorage.removeItem('sunzi:reading-progress:v1')")
    evaluate("localStorage.setItem('sunzi:reading-preferences:v1', JSON.stringify({version:1,speeds:{en:{ratePerMinute:150,sampleCount:2,updatedAt:1700000000000}}}))")
    command("Page.reload")
    wait_for("document.readyState === 'complete' && document.querySelector('h1') && document.querySelector('[role=progressbar]') && document.body.innerText.includes('Personalized')")
    time.sleep(1)

    initial = evaluate("({width: innerWidth, path: location.pathname, h1: document.querySelector('h1').textContent.trim(), overflow: document.documentElement.scrollWidth > innerWidth, hasWordCount: /[0-9,]+ words/.test(document.body.innerText), hasReadingTime: document.body.innerText.includes('3 min read'), hasPersonalized: document.body.innerText.includes('Personalized'), savedRate: JSON.parse(localStorage.getItem('sunzi:reading-preferences:v1')).speeds.en.ratePerMinute})")
    stats_screenshot = command("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    with open("/tmp/sunzi-chapter-stats-mobile.png", "wb") as output:
        output.write(base64.b64decode(stats_screenshot["data"]))
    command("Page.navigate", {"url": "http://127.0.0.1:3000/en/chapters/02-zuozhan"})
    wait_for("location.pathname === '/en/chapters/02-zuozhan' && document.querySelector('h1')?.textContent.includes('Waging War')")
    time.sleep(0.5)
    next_chapter = evaluate("({path: location.pathname, h1: document.querySelector('h1').textContent.trim()})")

    evaluate("const s=document.querySelector('select[aria-label=\"Language\"]'); s.value='ja'; s.dispatchEvent(new Event('change',{bubbles:true}))")
    wait_for("location.pathname === '/ja/chapters/02-zuozhan' && document.documentElement.lang === 'ja'")
    japanese = evaluate("({path: location.pathname, lang: document.documentElement.lang, h1: document.querySelector('h1').textContent.trim()})")

    evaluate("document.querySelector('a[href=\"/ja\"]')?.click()")
    wait_for("location.pathname === '/ja' && document.querySelector('h1') && document.body.innerText.includes('読書進捗')")
    progress_before_reload = evaluate("JSON.parse(localStorage.getItem('sunzi:reading-progress:v1'))")
    command("Page.reload")
    wait_for("document.readyState === 'complete' && document.querySelector('[role=progressbar]') && JSON.parse(localStorage.getItem('sunzi:reading-progress:v1')).currentLocale === 'ja'")
    time.sleep(1)
    progress_after_reload = evaluate("JSON.parse(localStorage.getItem('sunzi:reading-progress:v1'))")
    evaluate("const a=Array.from(document.querySelectorAll('select'));const s=a.find(x=>Array.from(x.options).some(o=>o.value==='shortest'));const t=a.find(x=>Array.from(x.options).some(o=>o.value==='10'));s.value='shortest';s.dispatchEvent(new Event('change',{bubbles:true}));t.value='2';t.dispatchEvent(new Event('change',{bubbles:true}))")
    wait_for("document.querySelector('[aria-label=\"読書プラン\"]')?.innerText.includes('短篇優先') && /13篇中[1-9][0-9]*篇/.test(document.querySelector('[aria-label=\"読書プラン\"]')?.innerText.replaceAll(' ',''))")
    home = evaluate("({path: location.pathname, h1: document.querySelector('h1').textContent.trim(), chapterLinks: document.querySelectorAll('a[href^=\"/ja/chapters/\"]').length, overflow: document.documentElement.scrollWidth > innerWidth, hasContinue: document.body.innerText.includes('続きを読む'), hasCharacterCount: document.body.innerText.includes('文字'), hasReadingTime: /約2分/.test(document.body.innerText.replaceAll(' ','')), hasPlanner: document.querySelector('[aria-label=\"読書プラン\"]')?.innerText.includes('短篇優先'), limitedCount:Number((document.querySelector('[aria-label=\"読書プラン\"]')?.innerText.replaceAll(' ','').match(/13篇中([0-9]+)篇/)||[])[1]), savedEnglishRate:JSON.parse(localStorage.getItem('sunzi:reading-preferences:v1')).speeds.en.ratePerMinute, progressNow: document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')})")
    screenshot = command("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    with open("/tmp/sunzi-reading-progress-mobile.png", "wb") as output:
        output.write(base64.b64decode(screenshot["data"]))

    assertions = [
        initial["width"] == 390,
        initial["path"] == "/en/chapters/01-shiji",
        initial["overflow"] is False,
        initial["hasWordCount"] is True,
        initial["hasReadingTime"] is True,
        initial["hasPersonalized"] is True,
        initial["savedRate"] == 150,
        next_chapter["path"] == "/en/chapters/02-zuozhan",
        japanese["path"] == "/ja/chapters/02-zuozhan",
        japanese["lang"] == "ja",
        home["path"] == "/ja",
        home["chapterLinks"] >= 2,
        home["chapterLinks"] < 14,
        home["overflow"] is False,
        home["hasContinue"] is True,
        home["hasCharacterCount"] is True,
        home["hasReadingTime"] is True,
        home["hasPlanner"] is True,
        home["limitedCount"] < 13,
        home["savedEnglishRate"] == 150,
        home["progressNow"] == "15",
        progress_before_reload == progress_after_reload,
        progress_after_reload["visitedChapterNumbers"] == [1, 2],
        progress_after_reload["currentChapterNumber"] == 2,
        progress_after_reload["currentLocale"] == "ja",
    ]
    if not all(assertions):
        raise AssertionError({"initial": initial, "next": next_chapter, "japanese": japanese, "home": home})
    print(json.dumps({"viewport": "390x844", "initial": initial, "nextChapter": next_chapter, "languageSwitch": japanese, "returnHome": home, "readingProgress": progress_after_reload, "screenshots": ["/tmp/sunzi-chapter-stats-mobile.png", "/tmp/sunzi-reading-progress-mobile.png"]}, ensure_ascii=False, indent=2))
finally:
    if ws is not None:
        ws.close()
    BROWSER.terminate()
    try:
        BROWSER.wait(timeout=5)
    except subprocess.TimeoutExpired:
        BROWSER.kill()
