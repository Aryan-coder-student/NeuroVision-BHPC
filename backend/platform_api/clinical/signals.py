"""Delete private media only after patient/report deletion commits."""
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import DatasetContributionFile, SegmentationReport


@receiver(post_delete, sender=SegmentationReport)
def cleanup_report_snapshot(sender, instance, using, **kwargs):
    if instance.snapshot_image and instance.snapshot_image.name:
        name = instance.snapshot_image.name
        storage = instance.snapshot_image.storage
        transaction.on_commit(lambda: storage.delete(name), using=using)


@receiver(post_delete, sender=DatasetContributionFile)
def cleanup_contributed_file(sender, instance, using, **kwargs):
    if instance.object_file and instance.object_file.name:
        name = instance.object_file.name
        storage = instance.object_file.storage
        transaction.on_commit(lambda: storage.delete(name), using=using)
