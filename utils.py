from django.db.utils import IntegrityError

def create_initial(model, **fields):
    try:
        model.objects.create(**fields)
    except IntegrityError:
        pass
