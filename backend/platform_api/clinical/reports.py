"""Short-lived, tamper-resistant proof of a successful backend MRI segmentation."""
import math
import re
import struct
import uuid
import zlib

from django.conf import settings
from django.core import signing
from rest_framework import serializers

REPORT_PROOF_SALT = "neurovision.segmentation-report.v1"
REPORT_PROOF_AGE_SECONDS = 15 * 60
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def clean_measurements(raw):
    """Keep numeric physical volumes only; never infer values from sample labels."""
    if not isinstance(raw, dict) or len(raw) > 12:
        return {}
    clean = {}
    for key, value in raw.items():
        if (
            isinstance(key, str)
            and re.fullmatch(r"[a-z][a-z0-9_]{0,47}", key)
            and isinstance(value, (int, float))
            and not isinstance(value, bool)
            and math.isfinite(value)
            and value >= 0
        ):
            clean[key] = float(value)
    return clean


def create_inference_report_token(*, patient_id, workspace_id, actor_id, model, measurements):
    """Only called after a provider produced an actual segmentation mask."""
    return signing.dumps(
        {
            "kind": "real_segmentation_inference",
            "nonce": str(uuid.uuid4()),
            "patient_id": str(patient_id),
            "workspace_id": str(workspace_id),
            "actor_id": str(actor_id),
            "model_id": str(model["id"]),
            "model_name": str(model["name"]),
            "model_version": str(model["version"]),
            "measurements_cm3": clean_measurements(measurements),
        },
        salt=REPORT_PROOF_SALT,
        compress=True,
    )


def verify_inference_report_token(token, *, patient_id, workspace_id, actor_id):
    try:
        data = signing.loads(
            token, salt=REPORT_PROOF_SALT, max_age=REPORT_PROOF_AGE_SECONDS
        )
    except signing.BadSignature as error:
        raise serializers.ValidationError({
            "report_token": "Invalid or expired proof of inference."
        }) from error
    if not isinstance(data, dict) or (
        data.get("kind") != "real_segmentation_inference"
        or data.get("patient_id") != str(patient_id)
        or data.get("workspace_id") != str(workspace_id)
        or data.get("actor_id") != str(actor_id)
    ):
        raise serializers.ValidationError({
            "report_token": "Inference proof does not belong to this patient or workspace."
        })
    try:
        data["nonce"] = uuid.UUID(data["nonce"])
    except (KeyError, TypeError, ValueError) as error:
        raise serializers.ValidationError({"report_token": "Invalid inference proof."}) from error
    return data


def validate_snapshot_png(raw):
    """Bound PNG dimensions and verify chunk CRC / zlib stream without Pillow."""
    if not raw.startswith(PNG_SIGNATURE) or len(raw) > settings.REPORT_SNAPSHOT_MAX_BYTES:
        raise serializers.ValidationError("Provide a PNG snapshot within the allowed size.")
    offset = len(PNG_SIGNATURE)
    has_header = False
    has_end = False
    compressed = bytearray()
    while offset + 12 <= len(raw):
        length = int.from_bytes(raw[offset:offset + 4], "big")
        end = offset + 12 + length
        if length > settings.REPORT_SNAPSHOT_MAX_BYTES or end > len(raw):
            break
        kind = raw[offset + 4:offset + 8]
        data = raw[offset + 8:offset + 8 + length]
        crc = int.from_bytes(raw[offset + 8 + length:end], "big")
        if zlib.crc32(kind + data) & 0xffffffff != crc:
            break
        if not has_header:
            if kind != b"IHDR" or length != 13:
                break
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", data)
            if not (1 <= width <= 4096 and 1 <= height <= 4096 and width * height <= 4096 * 4096):
                break
            if depth != 8 or color not in (0, 2, 4, 6) or compression or filtering or interlace:
                break
            has_header = True
        elif kind == b"IDAT":
            compressed.extend(data)
        elif kind == b"IEND":
            has_end = length == 0 and end == len(raw)
            break
        offset = end
    if not (has_header and has_end and compressed):
        raise serializers.ValidationError("Snapshot is not a valid PNG.")
    try:
        decoder = zlib.decompressobj()
        out = decoder.decompress(bytes(compressed), 64 * 1024 * 1024 + 1)
        if not decoder.eof or decoder.unconsumed_tail or len(out) > 64 * 1024 * 1024:
            raise ValueError("PNG image data exceeds the allowed limit")
    except (ValueError, zlib.error) as error:
        raise serializers.ValidationError("PNG image data is invalid.") from error
