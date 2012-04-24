import itertools
from django import forms
from django.utils.translation import ugettext as _
from django.utils.datastructures import SortedDict
from django.forms.models import BaseModelFormSet, BaseInlineFormSet, ModelFormMetaclass

def add_widget_css_class(widget, cls):
    try:
        widget.attrs['class'] += ' %s' % cls
    except KeyError:
        widget.attrs['class'] = cls

def is_subclass(subcls, cls):
    def get_bases(cls):
        result = []
        for base in cls.__bases__:
            result += get_bases(base)
            result.append(base)
        return result
    return cls in get_bases(subcls)

def get_declared_formsets(bases, attrs, with_base_fields=True):
    formsets = [(formset_name, attrs.pop(formset_name)) for formset_name, obj in attrs.items() if
            hasattr(obj, '__bases__') and is_subclass(obj, BaseModelFormSet)]

    if with_base_fields:
        for base in bases[::-1]:
            if hasattr(base, 'formset_classes'):
                formsets = base.formset_classes.items() + formsets
    else:
        for base in bases[::-1]:
            if hasattr(base, 'declared_formset_classes'):
                formsets = base.declared_formset_classes.items() + formsets

    return SortedDict(formsets)

class ComplexFormMetaclass(ModelFormMetaclass):
    def __new__(cls, name, bases, attrs):
        attrs['formset_classes'] = get_declared_formsets(bases, attrs)
        new_class = super(ComplexFormMetaclass,
                     cls).__new__(cls, name, bases, attrs)
        return new_class

class ComplexForm(forms.ModelForm):
    __metaclass__ = ComplexFormMetaclass

    def __init__(self, data=None, files=None, *args, **kwargs):
        super(ComplexForm, self).__init__(data, files, *args, **kwargs)
        self.formsets = list()
        self.check_formsets_change = True
        prefix = self.prefix or ''
        if prefix:
            prefix += '-'
        for formset_name, FormsetClass in self.formset_classes.iteritems():
            if is_subclass(FormsetClass, BaseInlineFormSet):
                formset = FormsetClass(data, files, instance=self.instance,
                        prefix=prefix+formset_name)
            else:
                formset = FormsetClass(data, files,
                        prefix=prefix+formset_name)
            self.formsets.append(formset)
            setattr(self, formset_name, formset)

    def clean(self):
        cleaned_data = super(ComplexForm, self).clean()
        formsets_valid = [formset.is_valid() for formset in self.formsets]
        if not all(formsets_valid):
            raise forms.ValidationError(_('Errors are below.'))
        return cleaned_data

    def has_changed(self):
        if super(ComplexForm, self).has_changed():
            return True
        if self.check_formsets_change:
            return any(form.has_changed() for form in itertools.chain(*self.formsets))
        else:
            return False

    def save(self, *args, **kwargs):
        if not self.check_formsets_change or super(ComplexForm, self).has_changed():
            instance = super(ComplexForm, self).save(*args, **kwargs)
        else:
            instance = self.instance
        if hasattr(self, 'save_m2m'):
            old_save_m2m = self.save_m2m
            def new_save_m2m():
                old_save_m2m()
                for formset in self.formsets:
                    formset.save()
            self.save_m2m = new_save_m2m
        else:
            for formset in self.formsets:
                formset.save(*args, **kwargs)
        return instance
