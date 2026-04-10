#!/usr/bin/env python3
"""
patch_server.py — Applique les 2 fixes sur server.js (v1.8.0 BrainEXE)
Usage : python patch_server.py
"""
import os, shutil

FILE = "server.js"

if not os.path.exists(FILE):
    print(f"❌ Fichier '{FILE}' introuvable — lance ce script dans le même dossier que server.js")
    exit(1)

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

original = content

# ── FIX 1 : BOT_PERSONA — supprimer la question forcée ─────────────────────
OLD1 = "- pose toujours une question ou un hook à la fin"
NEW1 = ("- conclus naturellement quand c'est le bon moment — relance uniquement si c'est vraiment justifié\n"
        "- NE pose PAS une question à chaque fin de message, c'est artificiel")

if OLD1 in content:
    content = content.replace(OLD1, NEW1, 1)
    print("✅ Fix 1 appliqué : BOT_PERSONA RÈGLES ABSOLUES corrigé")
else:
    print("⚠️  Fix 1 : ligne non trouvée (déjà corrigé ou différent ?)")

# ── FIX 2 : postRandomConversation — prompt corrigé ────────────────────────
OLD2 = "Pose un hook à la fin. Commence direct. Angle frais."
NEW2 = "Commence direct. Angle frais. Conclus si c'est le bon moment — pas de question forcée."

if OLD2 in content:
    content = content.replace(OLD2, NEW2, 1)
    print("✅ Fix 2 appliqué : postRandomConversation prompt corrigé")
else:
    print("⚠️  Fix 2 : texte non trouvé (déjà corrigé ou différent ?)")

if content == original:
    print("\n⚠️  Aucun changement effectué — les fixes sont peut-être déjà présents.")
    exit(0)

# Backup du fichier original
shutil.copy(FILE, FILE + ".bak")
print(f"\n📦 Backup créé : {FILE}.bak")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n🎉 {FILE} patché avec succès — 2 fixes appliqués !")
print("   → git add . && git commit -m \"fix: remove forced question hook\" && git push")
