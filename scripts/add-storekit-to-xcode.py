#!/usr/bin/env python3
"""
Idempotently register ios/Orbital/Products.storekit in Orbital.xcodeproj:
  - PBXFileReference
  - PBXBuildFile (Copy Bundle Resources)
  - Orbital group children
  - PBXResourcesBuildPhase
Uses stable UUIDs so repeated runs are no-ops.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PBX = ROOT / "ios/Orbital.xcodeproj/project.pbxproj"
STOREKIT = ROOT / "ios/Orbital/Products.storekit"

# Must match an existing integrated project (change only if you know what you're doing)
FILE_REF = "D4E38F1C2A5B6C7D008E01A1"
BUILD_REF = "D4E38F1D2A5B6C7D008E01A1"


def main() -> int:
    if not STOREKIT.is_file():
        print(f"BLOCKING: missing {STOREKIT}", file=sys.stderr)
        return 1
    if not PBX.is_file():
        print(f"BLOCKING: missing {PBX}", file=sys.stderr)
        return 1

    text = PBX.read_text(encoding="utf-8")
    if "Products.storekit" in text:
        print("✅ Products.storekit already in project.pbxproj")
        return 0

    build_line = f"\t\t{BUILD_REF} /* Products.storekit in Resources */ = {{isa = PBXBuildFile; fileRef = {FILE_REF} /* Products.storekit */; }};\n"
    file_ref_line = f"\t\t{FILE_REF} /* Products.storekit */ = {{isa = PBXFileReference; includeInIndex = 1; lastKnownFileType = text; name = Products.storekit; path = Orbital/Products.storekit; sourceTree = \"<group>\"; }};\n"

    if "/* End PBXBuildFile section */" not in text:
        print("BLOCKING: unexpected pbxproj (no PBXBuildFile section)", file=sys.stderr)
        return 1

    text = text.replace(
        "/* End PBXBuildFile section */",
        build_line + "/* End PBXBuildFile section */",
        1,
    )

    needle = '\t\tF11748442D0722820044C1D9 /* Orbital-Bridging-Header.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; name = "Orbital-Bridging-Header.h"; path = "Orbital/Orbital-Bridging-Header.h"; sourceTree = "<group>"; };\n/* End PBXFileReference section */'
    if needle not in text:
        print("BLOCKING: pbxproj layout changed — re-integrate Products.storekit manually", file=sys.stderr)
        return 1

    text = text.replace(
        needle,
        '\t\tF11748442D0722820044C1D9 /* Orbital-Bridging-Header.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; name = "Orbital-Bridging-Header.h"; path = "Orbital/Orbital-Bridging-Header.h"; sourceTree = "<group>"; };\n'
        + file_ref_line
        + "/* End PBXFileReference section */",
        1,
    )

    group_needle = "\t\t\t\tBD5CFE146FA331030FB24EC7 /* PrivacyInfo.xcprivacy */,\n\t\t\t);\n\t\t\tname = Orbital;"
    group_repl = (
        "\t\t\t\tBD5CFE146FA331030FB24EC7 /* PrivacyInfo.xcprivacy */,\n"
        f"\t\t\t\t{FILE_REF} /* Products.storekit */,\n"
        "\t\t\t);\n\t\t\tname = Orbital;"
    )
    if group_needle not in text:
        print("BLOCKING: Orbital group block not found", file=sys.stderr)
        return 1
    text = text.replace(group_needle, group_repl, 1)

    res_needle = "\t\t\t\tD9C6072F22CBDB0A4AAABE43 /* PrivacyInfo.xcprivacy in Resources */,\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;"
    res_repl = (
        "\t\t\t\tD9C6072F22CBDB0A4AAABE43 /* PrivacyInfo.xcprivacy in Resources */,\n"
        f"\t\t\t\t{BUILD_REF} /* Products.storekit in Resources */,\n"
        "\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;"
    )
    if res_needle not in text:
        print("BLOCKING: Resources build phase block not found", file=sys.stderr)
        return 1
    text = text.replace(res_needle, res_repl, 1)

    PBX.write_text(text, encoding="utf-8")
    print(f"✅ Wrote Products.storekit into {PBX}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
