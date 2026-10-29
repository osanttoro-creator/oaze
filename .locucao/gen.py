import asyncio, json, os, edge_tts
req = json.load(open(".locucao/request.json"))
VOICES = ["pt-BR-FranciscaNeural", "pt-BR-ThalitaMultilingualNeural", "pt-BR-ThalitaNeural"]
async def main():
    for v in VOICES:
        for vid, segs in req.items():
            d = f".locucao/out/{v}/{vid}"; os.makedirs(d, exist_ok=True)
            for s in segs:
                try:
                    await edge_tts.Communicate(s["text"], v).save(f"{d}/{s['id']}.mp3")
                except Exception as e:
                    print("ERRO", v, s["id"], e)
asyncio.run(main())
