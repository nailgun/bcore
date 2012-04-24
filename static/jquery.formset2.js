(function($) {
    var getForms = function(excludeEmpty) {
        var $forms = this.target.find(this.options.forms);
        if (excludeEmpty) {
            $forms = $forms.not('.'+this.options.emptyClass);
        }
        return $forms;
    };

    var updateFormIndex = function($form, idx) {
        var prefix = this.options.prefix;
        var idRegex = new RegExp(prefix+'-(\\d+|__prefix__)-');
        var replacement = prefix+'-'+idx+'-';
        $form.data('prefix', prefix+'-'+idx);

        var updateElementIndex = function($el) {
            if ($el.attr("for")) $el.attr("for", $el.attr("for").replace(idRegex, replacement));
            if ($el.attr('id')) $el.attr('id', $el.attr('id').replace(idRegex, replacement));
            if ($el.attr('name')) $el.attr('name', $el.attr('name').replace(idRegex, replacement));
        };

        updateElementIndex($form);
        $form.find('*').each(function() {
            updateElementIndex($(this));
        });
    };

    var enumerateForms = function() {
        var formset = this;
        var $forms = formset.getForms(true);

        $('#id_'+formset.options.prefix+'-TOTAL_FORMS').val($forms.length);

        $forms.each(function(idx) {
            formset.updateFormIndex($(this), idx);
        });
    };

    var deleteForm = function($form) {
        var $del = $form.find('input[id $= "-DELETE"]');
        if ($del.length) {
            $del.val('on');
            $form.hide();
        } else {
            $form.remove();
        }
    };

    var insertDeleteLink = function($form) {
        var formset = this;

        var $del = $form.find('input:hidden[id $= "-DELETE"]');
        if (!$del.length) {
            return;
        }

        var $link = $(formset.options.deleteLink);
        $link.insertBefore($del);
        if ($form.hasClass(formset.options.emptyClass)) {
            $del.remove();
        }

        $link.click(function(e) {
            e.preventDefault();

            var $form = $(this).parents(formset.options.forms);
            formset.deleteForm($form);
            formset.enumerateForms();

            if (formset.options.removed) {
                formset.options.removed.call(formset, $row);
            }
        });
    };

    var createAddLink = function() {
        var formset = this;
        var $formset = this.target;
        var $forms = formset.getForms(false);

        var $link = $(formset.options.addLink);

        var columnCount = function($tr) {
            var numCols = 0;
            $tr.children().each(function() {
                numCols += this.colSpan;
            });
            return numCols;
        }

        if ($forms.is('tr')) {
            var numCols = columnCount($forms.eq(0));
            var $td = $('<td colspan="'+numCols+'"></td>').append($link);
            $formset.append($('<tr></tr>').append($td));

        } else if ($forms.is('tbody')) {
            var numCols = columnCount($forms.children('tr').eq(0));
            var $td = $('<td colspan="'+numCols+'"></td>').append($link);
            $formset.append($('<tbody></tbody>').append($('<tr></tr>').append($td)));

        } else {
            $forms.filter(':last').after($link);
        }

        $link.click(function(e) {
            e.preventDefault();
            var $form = formset.addForm($form);
            if (formset.options.added) {
                formset.options.added.call(formset, $form);
            }
        });
    };

    var addForm = function() {
        var formset = this;

        var $total = $('#id_'+formset.options.prefix+'-TOTAL_FORMS');
        var $form = formset.template.clone(true).removeClass(formset.options.emptyClass);
        var formCount = parseInt($total.val());

        $form.insertBefore(formset.template);
        formset.updateFormIndex($form, formCount);
        $total.val(formCount + 1);

        return $form;
    };

    var methods = {
        init : function(options) {
            var options = $.extend({
                prefix: 'form',                       // The form prefix for your django formset
                forms: '.form',                       // CSS selector for forms (including empty form)
                emptyClass: 'empty-form',             // CSS class for the empty form

                allowAdd: true,                       // Allow user to add new objects

                addLink: '<a href="#">+ add</a>',     // Add link HTML
                deleteLink: '<a href="#">delete</a>', // Delete link HTML

                added: null,                          // Function called each time a new form is added
                removed: null                         // Function called each time a form is deleted
            }, options);

            var formset = {
                target : this,
                options : options
            };
            formset.insertDeleteLink = insertDeleteLink;
            formset.enumerateForms = enumerateForms;
            formset.updateFormIndex = updateFormIndex;
            formset.createAddLink = createAddLink;
            formset.getForms = getForms;
            formset.addForm = addForm;
            formset.deleteForm = deleteForm;

            var $formset = this;
            $formset.data('formset', formset);
            var $forms = $formset.find(options.forms);

            $forms.each(function(idx) {
                var $form = $(this);
                formset.insertDeleteLink($form);
                $form.data('prefix', options.prefix+'-'+idx);
            });

            var $template = $formset.find(options.forms).filter('.'+options.emptyClass);
            if ($template.length) {
                formset.template = $template;
                if (options.allowAdd) {
                    formset.createAddLink();
                }
            } else {
                formset.template = null;
            }

            return this;
        },

        addForm : function(initialData) {
            var $formset = this;
            var formset = $formset.data('formset');
            var $form = formset.addForm();

            $.each(initialData, function(key, value) {
                $form.find('[id $= "-'+key+'"]').val(value);
            });

            return $form;
        },

        deleteForm : function($form) {
            var $formset = this;
            var formset = $formset.data('formset');
            formset.deleteForm($form);
            formset.enumerateForms();
        },

        deleteAllForms : function() {
            var $formset = this;
            var formset = $formset.data('formset');
            formset.getForms(true).each(function() {
                formset.deleteForm($(this));
            });
            formset.enumerateForms();
        },

        getForms : function(includeEmpty) {
            var $formset = this;
            var formset = $formset.data('formset');
            return formset.getForms(!includeEmpty);
        },

        getFormData : function($form) {
            var prefix = 'id_'+$form.data('prefix')+'-';
            var data = {};
            $form.find('[id ^= "'+prefix+'"]').each(function() {
                var key = this.id.slice(prefix.length);
                data[key] = $(this).val();
            });
            return data;
        }
    };

    $.fn.formset = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if(typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.formset');
        }    
    }
})(jQuery);
