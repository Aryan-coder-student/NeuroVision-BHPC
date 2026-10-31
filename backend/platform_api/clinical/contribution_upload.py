"""Bounded research-only NIfTI and DICOM ZIP validation, no PHI guarantee."""
import gzip
import zipfile
from rest_framework.exceptions import ValidationError

MAX_FILE_BYTES = 32 * 1024 * 1024  # Render Free synchronous upload safeguard
MAX_ZIP_EXPANDED_BYTES = 256 * 1024 * 1024
NIFTI_KEYS = frozenset(("t1", "t1ce", "t2", "flair"))
MAX_DICOM_MEMBERS = 512


def _valid_nifti(file):
    name = file.name.lower()
    if not (name.endswith(".nii") or name.endswith(".nii.gz")):
        return False
    try:
        file.seek(0)
        if name.endswith(".gz"):
            with gzip.GzipFile(fileobj=file, mode="rb") as stream:
                header = stream.read(4)
        else:
            header = file.read(4)
        return int.from_bytes(header, "little") in (348, 540) or int.from_bytes(header, "big") in (348, 540)
    except (OSError, EOFError, ValueError):
        return False
    finally:
        file.seek(0)


def _valid_dicom_zip(file):
    try:
        file.seek(0)
        with zipfile.ZipFile(file) as archive:
            members = [entry for entry in archive.infolist() if not entry.is_dir()]
            if not 1 <= len(members) <= MAX_DICOM_MEMBERS:
                return False
            if sum(entry.file_size for entry in members) > MAX_ZIP_EXPANDED_BYTES:
                return False
            for entry in members:
                path = entry.filename.replace("\\", "/")
                if (
                    path.startswith("/") or ".." in path.split("/")
                    or not path.lower().endswith(".dcm")
                    or entry.flag_bits & 1
                    or entry.file_size > 32 * 1024 * 1024
                    or ((entry.external_attr >> 16) & 0o170000) == 0o120000
                ):
                    return False
                # A conservative DICOM Part-10 check; non-Part-10 raw streams
                # are intentionally not accepted by this public demo upload.
                with archive.open(entry) as stream:
                    if len(stream.read(132)) != 132:
                        return False
                    stream.seek(0) if stream.seekable() else None
                with archive.open(entry) as stream:
                    head = stream.read(132)
                    if head[128:132] != b"DICM":
                        return False
            return True
    except (OSError, EOFError, ValueError, RuntimeError, zipfile.BadZipFile, NotImplementedError):
        return False
    finally:
        file.seek(0)


def validate_contribution_files(files):
    """Return (format, [(modality, upload)...]); reject anything else."""
    names = set(files.keys())
    if names == NIFTI_KEYS:
        checked = [(key, files[key]) for key in ("t1", "t1ce", "t2", "flair")]
        kind = "nifti"
    elif names == {"dicom_archive"}:
        checked = [("dicom_archive", files["dicom_archive"])]
        kind = "dicom_zip"
    else:
        raise ValidationError({"files": (
            "Select all four NIfTI modalities (T1, T1CE, T2, FLAIR) "
            "or one .zip of de-identified DICOM Part-10 .dcm files."
        )})
    for label, file in checked:
        if not 0 < file.size <= MAX_FILE_BYTES:
            raise ValidationError({label: "File must be between 1 byte and 32 MiB."})
        valid = _valid_dicom_zip(file) if kind == "dicom_zip" else _valid_nifti(file)
        if not valid:
            raise ValidationError({
                label: "Invalid NIfTI header or DICOM ZIP archive. Do not upload identifiable scans."
            })
    return kind, checked
