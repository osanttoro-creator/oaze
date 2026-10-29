import asyncio, json, os, edge_tts
req = json.load(open(".locucao/request.json"))
VOICES = ["pt-BR-ThalitaMultilingualNeural"]
async def main():
    for v in VOICES:
        for vid, segs in req.items():
            d = f".locucao/out/{v}/{vid}"; os.makedirs(d, exist_ok=True)
            for s in segs:
                p = f"{d}/{s['id']}.mp3"
                if os.path.exists(p) and os.path.getsize(p) > 1000:
                    continue
                for tent in range(5):
                    try:
                        await edge_tts.Communicate(s["text"], v).save(p)
                        if os.path.getsize(p) > 1000: break
                    except Exception as e:
                        print("ERRO", v, s["id"], tent, e)
                    await asyncio.sleep(3 + tent * 3)
asyncio.run(main())
