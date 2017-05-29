# crudl
CRUDL is a React application for rapidly building an admin interface based on your API. You just need to define the endpoints and a visual representation in order to get a full-blown UI for managing your data.

## TOC
* [About](#about)
* [Architecture](#architecture)
* [Options](#options)
* [Admin](#admin)
    * [Attributes and properties](#attributes-and-properties)
* [Connectors](#connectors)
    * [Requests](#requests)
    * [Data](#data)
    * [Errors](#errors)
* [Views](#views)
    * [Actions](#actions)
    * [Promise functions](#promise-functions)
    * [Normalize and denormalize functions](#normalize-and-denormalize-functions)
    * [Paths](#paths)
* [List View](#list-view)
* [Change View](#change-view)
* [Add View](#add-view)
* [Fieldsets](#fieldsets)
* [Fields](#fields)
    * [onChange](#onchange)
    * [getValue](#getvalue)
    * [lazy](#lazy)
    * [Custom attributes](#custom-attributes)
* [Permissions](#permissions)
    * [Example of a connector providing permissions](#example-of-a-connector-providing-permissions)
* [Messages](#messages)
* [Credits & Links](#credits--links)

## Architecture
The CRUDL architecture (depicted below) consists of three logical layers. The connectors, views, and the react-redux frontend. We use React and Redux for the frontend, which consists of different views such as *list*, *add*, and *change* view.  The purpose of the connectors layer is to provide the views with a unified access to different APIs like REST or GraphQL. You configure the connectors, the fileds, and the views by providing a [admin](#admin).
```
+-----------------------+
|     React / Redux     |     
+-----------------------+
|         Views         |
+-----------------------+
  ↓         ↑         ↑         CRUDL
request   data     errors
  ↓         ↑         ↑
+-----------------------+
|       Connectors      |
+-----------------------+       ------------
            ↕                  
         ~~~~~~~           
           API                  BACKEND
         ~~~~~~~             

```

## Admin
The purpose of the admin is to provide CRUDL with the necessary information about the connectors and the views.
The admin is an object with the following attributes and properties:
```js
const admin = {
    title,              // Title of the CRUDL instance (a string or a react element property)
    views,              // a dictionary of views
    auth: {
        login,          // Login view descriptor
        logout,         // Logout view descriptor
    },
    custom: {
        dashboard,      // The index page of the CRUDL instance (a string or a react element property)
        pageNotFound,   // The admin of the 404 page        
        menu,           // The custom navigation
    },
    options: {
        debug,          // Include DevTools (default false)
        basePath,       // The basePath of the front end (default  '/crudl/')
        baseURL,        // The baseURL of the API backend (default  '/api/')
        rootElementId,  // Where to place the root react element (default 'crudl-root')
    }
    messages,           // An object of custom messages
    crudlVersion,       // The required crudl version in the semver format (e.g., "^0.3.0")
    id,                 // The id of the admin. This id is stored (together with other info) locally in the
                        // localStorage of the browser. If the admin id and the locally stored id do not match,
                        // the stored information will not be used. That means, for example, that by changing
                        // the admin id, you can enforce a logout of all users.
}
```
The provided admin will be validated (using [Joi](https://github.com/hapijs/joi)) and all its attributes and properties are checked against the admin's schema.

> ### Attributes and properties
We distinguish between attributes and properties. An attribute is a value of a certain type (such as string, boolean, function, an object, etc.), whereas property can also be a function that returns such a value. In other words, with property you can also provide the getter method. For example, the title of the CRUDL instance is a string (or react element) property. So you can define it as
```js
title: 'Welcome to CRUDL'`
```
or as
```js
title: () => `Welcome to CRUDL. Today is ${getDayName()}
```
or even as:
```js
title: () => <span>Welcome to <strong>CRUDL</strong>. Today is {getDayName()}</span>,
```

## Options
In `admin.options` you may specify some general CRUDL settings
```js
{
    debug: false,                   // Include DevTools?
    basePath: '/crudl/',            // The basePath of the front end
    baseURL: '/api/',               // The baseURL of the API (backend)
    rootElementId: 'crudl-root',    // Where to place the root react element
}
```
Assuming we deploy CRUDL on www.mydomain.com, we'll have CRUDL running on `www.mydomain.com/crudl/...` and the ajax requests of the connectors will be directed at `www.mydomain.com/api/...`.

## Connectors
Connectors provide CRUDL with a unified view of the backend API. Connectors are a separate [package](https://github.com/crudlio/crudl-connectors-base) which can be also used independently from CRUDL.

### Requests
A request object contains all the information necessary to execute one of the CRUD methods on a connector.
It is an object with the following attributes:
```js
{
    data,           // Context dependent: in a change view, the data contains the form values
    params,         // Connectors may require parameters to do their job, these are stored here
    filters,        // The requested filters
    sorting,        // The requested sorting
    page,           // The requested page
    headers,        // The http headers (e.g. the auth token)
}
```

### Data
List views require data to be in an array form `[ item1, item2, ... ]`. Where `item` is an object. Pagination information may be included as a parameters of the array:
```js
result = [ item1, item2, ... ],
result.pagination = {
    type: 'numbered',
    allPages: [1, 2],
    currentPage: 1,
}
```

Change and add views require the data as an object, e.g.
```js
{
    id: '3'
    username: 'Jane',
    email: 'jane@crudl.io'
}
```

### Errors
It is the responsibility of the connectors to throw the right errors. CRUDL distinguishes three kinds of errors:

* Validation error: The submitted form is not correct.
    ```js
    {
        validationError: true,
        errors: {
            title: 'Title is required',
            _errors: 'Either category or tag is required',
        }
    }
    ```
    Non field errors have the special attribute key `_error` (we use the same format error as [redux-form](https://github.com/erikras/redux-form)).

* Authorization error: The user is not authorized. When this error is thrown, CRUDL redirects the user to the login view.
    ```js
    {
        authorizationError: true,
    }
    ```

* Default error: When something else goes wrong.

If any of the thrown errors contains an attribute `message`, this message will be displayed as a notification to the user.

## Views
The attribute `admin.views` is a dictionary of the form:
```js
{
    name1: {
        listView,       // required
        changeView,     // required
        addView,        // optional
    },
    name2: {
        listView,
        changeView,
        addView,
    },
    ...

}
```

Before we go into details about the views, let's define some common elements of the view:

### Paths
> Note on paths and urls. In order to distinguish between backend URLs and the frontend URLs, we call the later *paths*. That means, connectors (ajax call) access URLs and views are displayed at paths.

A path can be defined as a simple (`'users'`) or parametrized (`'users/:id'`) string.
The parametrized version of the path definition is used only in change views and is not applicable to the list or add views. In order to resolve the parametrized change view path, the corresponding list item is used as the reference. The parameters of the current path are exported in the variable `crudl.path`.

### Actions
Each view must define its `actions`, which is an object [property](#attributes-and-properties). The attributes of the actions property are the particular actions.

An action is a function that takes a request as its argument and returns a *promise*. This promise either resolves to [data](#Data) or throws an [error](#errors). Typically, action use some [connectors](https://github.com/crudlio/crudl-connectors-base) to do their job. For example, a typical list view defines an action like this:
```js
const users = createDRFConnector('api/users/')
listView.actions = {
    list: (req) => users.read(req), // or just `list: users.read`
}
```
A typical `save` action of a change view looks for example like this:
```js
const users = createDRFConnector('api/users/:id/')
changeView.path = 'users/:id',
changeView.actions = {
    save: (req) => user(crudl.path.id).save(req),
}
```

### Normalize and denormalize functions
The functions `normalize` and `denormalize` are used to prepare, manipulate, annotate etc. the data for the frontend and for the backend. The normalization function prepares the data for the frontend (before they are displayed) and the denormalization function prepares to data for the backend (before they are passed to the connectors). The general form is `(data) => data` for views and `(value, allValues) => value` for [fields](#fields).

## List View
A list view is defined like this:
```js
{
    // Required:
    path,             // The path of this view e.g. 'users' relative to options.basePath
    title,            // A string - title of this view (shown in navigation) e.g. 'Users'
    fields,           // An array of list view fields (see below)
    actions: {
        list,         // The list action (see below)
    },
    bulkActions: {...} // See bellow
    permissions: {    
        list: <boolean>, // Does the user have a list permission?
    }        
    // Optional:
    filters: {       
        fields,       // An array of fields (see below)
        denormalize,  // The denormalize function for the filters form
    }
    normalize,        // The normalize function of the form (listItems) => listItems (see below)
}
```

* `list` resolves to an array `[{ ...item1 }, { ...item2 }, ..., { ...itemN }]`. The array may optionally contain a pagination attribute.

* `filters.fields`: See [fields](#fields) for details.

* `normalize`: a function of the form `listItems => listItems`

###
Crudl supports bulk actions over selected list view items. Bulk actions are defined like this:
```js
listView.bulkActions=  {
    actionName: {
        description: 'What the action does',
        modalConfirm: {...} // Require modal dialog for confirmation (Optional)
        before: (selection) => {...} // Do something with the selection before the action
        action: (selection) => {...} // Do the bulk action
        after: (selection) => {...}, // Do something with the results afterwards
    },
    // more bulk actions...
}
```
An example of a delete bulk action using a modal confirmation:
```js
delete: {
    description: 'Delete tags',
    modalConfirm: {
        message: "All the selected items will be deleted. This action cannot be reversed!",
        modalType: 'modal-delete',
        labelConfirm: "Delete All",
    },
    action: (selection) => Promise.all(selection.map(item => tag(item.id).delete(crudl.req())))
        .then(() => crudl.successMessage(`All items (${selection.length}) were deleted`))
    },
},
```

The *before* and *after* actions can return a React component that will be displayed in an overlay window. This component will receive two handlers as props: `onProceed` and `onCancel`.

An example of a *Change Section* action:
```js
changeSection: {
    description: 'Change Section',
    // Create a submission form to select a section
    // onProceed and onCancel are handlers provided by the list view
    before: selection => ({ onProceed, onCancel }) => (
        <div>
        {crudl.createForm({
            id: 'select-section',
            title: 'Select Section',
            fields: [{
                name: 'section',
                label: 'Section',
                field: 'Select',
                lazy: () => options('sections', 'id', 'name').read(crudl.req()), // options(...) is a connector
            }],
            // Using the onProceed handler, we pass an amended selection to the action function
            onSubmit: values => onProceed(selection.map(s => Object.assign({}, s, { section: values.section }))),
            onCancel,
        })}
        </div>
    ),
    // The action itself
    action: selection => Promise.all(selection.map(
        item => category(item.id).update(crudl.req(item))
    )).then(() => crudl.successMessage('Successfully changed the sections')),
},
```

## Change View
```js
{
    // Required
    path,               // Parametrized path definition
    title,              // A string e.g. 'User'
    actions: {
        get,            
        save,
        delete,
    },
    permissions: {    
        get: <boolean>,     // Does the user have a view permission?
        save: <boolean>,    // Does the user have a change permission?
        delete: <boolean>,  // Does the user have a delete permission?
    },
    fields,             // A list of fields
    fieldsets,          // A list of fieldsets

    // Optional
    tabs,               // A list of tabs
    normalize,          // The normalization function (dataToShow) => dataToShow
    denormalize,        // The denormalization function (dataToSend) => dataToSend
    validate,           // Frontend validation function
}
```
Either `fields` or `fieldsets`, but not both, must be specified. The attribute `validation` is a [redux-form](https://github.com/erikras/redux-form) validation function.

## Add View
The add view defines almost the same set of attributes and properties as the change view. It is often possible to reuse parts of the change view.
```js
{
    // Required
    path,               // A path definition
    title,              // A string. e.g. 'Add new user'
    actions: {
        add,
    },
    permissions: {    
        add: <boolean>, // Does the user have a create permission?
    },
    fields,             // A list of fields
    fieldsets,          // A list of fieldsets

    // Optional
    validate,           // Frontend validation function
    denormalize,        // Note: add views don't have a normalize function
}
```

## Fieldsets
With fieldsets, you are able to group fields with the change/addView.
```js
{
    // Required
    fields,                 // Array of fields

    // Optional properties
    title,                  // string property
    hidden,                 // boolean property e.g. hidden: () => !isOwner()
    description,            // string or react element property
    expanded,               // boolean property

    // Misc optional
    onChange,               // onChange (see below)
}
```

## Fields
With the fields, you describe the behavior of a single element with the changeView and/or addView. All the attributes of the field descriptor will be passed as props to the field component. The field descriptor can contain further custom attributes which are as well passed as props to the field component.
```js
{
    // Required attributes
    name,                   // string property
    field,                  // either a string  (i.e. a name a field component) or
                            // directly a react component. It is not required only when hidden == true
                            // This attribute cannot be obtained asynchronously

    // Optional attributes
    getValue,               // A function of the form `(data) => fieldValue`. Default: `(data) => data[name]`
    label,                  // string property (by default equal to the value of name)
    readOnly,               // boolean property
    required,               // boolean property
    disabled,               // boolean property
    hidden,                 // boolean property
    initialValue,           // Initial value in an add view
    validate,               // a function (value, allFieldsValues) => error || undefined
    normalize,              // a function (valueFromBackend) => valueToFrontend
    denormalize,            // a function (valueFromFrontend) => valueToBackend
    onChange,               // onChange specification (see bellow)
    add,                    // add relation specification (see bellow)
    edit,                   // edit relation specification (see bellow)
    lazy,                   // A function returning promise (see bellow)

    // further custom attributes and props
}
```

### getValue

The value of the field is by default `data[name]`, where `name` is the required name attribute of the field descriptor and `data` is the response data from an API call. You can customize this behavior by providing your own `getValue` function of the form `(data) => fieldValue`. For example, suppose the returned data is
```js
{
    username: 'joe'
    contact: {
        email: 'joe@github.com'
        address: '...',
    }
}
```
and you want to describe an `email` field:
```js
{
    name: 'email',
    field: 'TextField',
    getValue: data => data.contact.email,
}
```

### onChange
With onChange, you are able to define dependencies between one or more fields. For example, you might have a field Country and a field State. When changing the field Country, the options for field State should be populated. In order to achieve this, you use onChange with State, listening to updates in Country and (re)populate the available options depending on the selected Country.
```js
{
    // Required
    in,                     // a string or an array of strings (field names)

    // Optional
    setProps,               // An object or a promise function
    setValue,               // a plain value or a promise function
    setInitialValue,        // a plain valuer or a promise function
}
```

### lazy

By defining the `lazy` function, you may provide some attributes of the descriptor asynchronously. The lazy function takes zero arguments and must return a promise which resolves to an object (i.e. a partial descriptor). You __cannot__ provide the attributes `name` and `field` asynchronously.

__Example:__ A Select field component has a prop `options` which is an array of objects with attributes `value` and `label`. You can provide these options _synchronously_ like this:
```js
{
    name: 'rating',
    label: 'Service Rating',
    field: 'Select',
    options: [{value: 0, label: 'Bad'}, {value: 1, label: 'Good'}, {value: 2, label: 'Excellent'}]
},
```
Or you can provide these options _asynchronously_ using the lazy function:
```js
{
    name: 'rating',
    label: 'Service Rating',
    field: 'Select',
    lazy: () => crudl.connectors.ratings.read(crudl.req()).then(response => ({
        options: response.data,
    })),
},
```
Note that all the descriptor attributes will be passed as props to the field component. This is also true for asynchronously provided attributes.

### Custom attributes

You can provide any number of further custom attributes which will then be passed as props to the field component. Note however that the following props are already passed to the field components and cannot be overwritten:
- `dispatch`
- `input`
- `meta`
- `registerFilterField`
- `onAdd`
- `onEdit`

## Permissions
Each view may define its permissions. Permissions are defined on a per-action basis. A change view, for example, can define `get`, `save`, and `delete` actions, so it can specify corresponding `get`, `save`, and `delete` permissions like this:
```js
changeView.permissions = {
    get: true, // A user can view the values
    save: true, // A user may save changes
    delete: false, // A user cannot delete the resource
}
```

The permission key of a view is a _property_. That means you can define a getter and assign permissions dynamically. For example:
```js
changeView.permissions = {
    delete: () => crudl.auth.user == crudl.context('owner'), // Only the owner of the resource can delete it
}
```

Beside defining the permissions in the view descriptors, you can provide them also in the API responses. In order to do so, your connector must return a response with an attribtue `permissions` of the form:
```js
response.permissions = {
    viewPath1: { actionName1: <boolean>, actionName2: <boolean>, ... },
    viewPath2: { actionName1: <boolean>, actionName2: <boolean>, ... },
    ...
}
```
where a `viewPath` is the path of a particular view in the admin object without the prefix `views`. Formally: if `viewPath` is `X.Y`, then it holds that `admin.views.X.Y === _.get(admin, 'views.' + 'viewPath')`.

### Example of a connector providing permissions
Suppose that a successful login API call returns the following data:
```json
{
    "username":"demo",
    "token":"cb1de9d5cd25d0abce47c36be67b1aa26a210eda",
    "user":1,
    "permission_list": [
        {
            "blogentry": {
                "create": false,
                "read": true,
                "update": true,
                "delete": true,
                "list": true
            }
        }
    ]
}
```
A login connector that includes these permission and _additionally_ prohibits deletion and creating of users may look like this:
```js
admin.connectors = {
    login: {
        url: '/rest-api/login/',
        mapping: { read: 'post', },
        transform: {
            readResponse(res => res
                .set('permissions', {
                    'users.changeView': { delete: false },
                    'users.addView': { add: false },
                    ...translatePermissions(data.permission_list),
                })
                .set('data', {
                    requestHeaders: { "Authorization": `Token ${data.token}` },
                    info: { user: data.user, username: data.username },
                })
            ),
        },
    },
    // ...other connectors
}
```
The `translatePermissions` function is backend specific and so the user must take care of the translation herself. In this particular example, the `translatePermissions` will return:
```js
{
    blogentries.addView: { add: false },
    blogentries.changeView: { get: true, save: true, delete: true }
    blogentries.listView: { list: true},
}
```

## Messages

We use [react-intl](https://github.com/yahoo/react-intl) in order to provide for custom messages and translations. Examples of some custom messages:

```js
admin.messages = {
    'changeView.button.delete': 'Löschen',
    'changeView.button.saveAndContinue': 'Speichern und weiter bearbeiten',
    'changeView.button.save': 'Speichern',
    'modal.labelCancel.default': 'Abbrechen',
    'login.button': 'Anmelden',
    'logout.affirmation': 'Tchüß!',
    'logout.loginLink': 'Nochmal einloggen?',
    'logout.button': 'Abmelden',
    'pageNotFound': 'Die gewünschte Seite wurde nicht gefunden!',
    // ...more messages
}
```

This ist the complete list of all message IDs:
```json
[
  {
    "id": "addView.button.save",
    "defaultMessage": "Save"
  },
  {
    "id": "addView.button.saveAndContinue",
    "defaultMessage": "Save and continue editing"
  },
  {
    "id": "addView.button.saveAndAddAnother",
    "defaultMessage": "Save and add another"
  },
  {
    "id": "addView.add.success",
    "defaultMessage": "Succesfully created {title}."
  },
  {
    "id": "addView.add.failed",
    "defaultMessage": "The form is not valid. Correct the errors and try again."
  },
  {
    "id": "addView.modal.unsavedChanges.message",
    "defaultMessage": "You have unsaved changes. Are you sure you want to leave?"
  },
  {
    "id": "addView.modal.unsavedChanges.labelConfirm",
    "defaultMessage": "Yes, leave"
  }
  {
    "id": "changeView.button.delete",
    "defaultMessage": "Delete"
  },
  {
    "id": "changeView.button.save",
    "defaultMessage": "Save"
  },
  {
    "id": "changeView.button.saveAndContinue",
    "defaultMessage": "Save and continue editing"
  },
  {
    "id": "changeView.modal.unsavedChanges.message",
    "defaultMessage": "You have unsaved changes. Are you sure you want to leave?"
  },
  {
    "id": "changeView.modal.unsavedChanges.labelConfirm",
    "defaultMessage": "Yes, leave"
  },
  {
    "id": "changeView.modal.deleteConfirm.message",
    "defaultMessage": "Are you sure you want to delete this {item}?"
  },
  {
    "id": "changeView.modal.deleteConfirm.labelConfirm",
    "defaultMessage": "Yes, delete"
  },
  {
    "id": "changeView.deleteSuccess",
    "defaultMessage": "{item} was succesfully deleted."
  },
  {
    "id": "changeView.saveSuccess",
    "defaultMessage": "{item} was succesfully saved."
  },
  {
    "id": "changeView.validationError",
    "defaultMessage": "The form is not valid. Correct the errors and try again."
  }
  {
    "id": "inlinesView.button.delete",
    "defaultMessage": "Delete"
  },
  {
    "id": "inlinesView.button.save",
    "defaultMessage": "Save"
  },
  {
    "id": "inlinesView.modal.deleteConfirm.message",
    "defaultMessage": "Are you sure you want to delete {item}?"
  },
  {
    "id": "inlinesView.modal.deleteConfirm.labelConfirm",
    "defaultMessage": "Yes, delete"
  },
  {
    "id": "inlinesView.deleteSuccess",
    "defaultMessage": "{item} was succesfully deleted."
  },
  {
    "id": "inlinesView.deleteFailure",
    "defaultMessage": "Failed to delete {item}."
  },
  {
    "id": "inlinesView.addSuccess",
    "defaultMessage": "{item} was succesfully created."
  },
  {
    "id": "inlinesView.saveSuccess",
    "defaultMessage": "{item} was succesfully saved."
  },
  {
    "id": "inlinesView.validationError",
    "defaultMessage": "The form is not valid. Correct the errors and try again."
  }
  {
    "id": "login.button",
    "defaultMessage": "Login"
  },
  {
    "id": "login.success",
    "defaultMessage": "You're logged in!"
  },
  {
    "id": "login.failed",
    "defaultMessage": "Login failed"
  }
  {
    "id": "logout.button",
    "defaultMessage": "Logout"
  },
  {
    "id": "logout.affirmation",
    "defaultMessage": "You have been logged out."
  },
  {
    "id": "logout.loginLink",
    "defaultMessage": "Log in again?"
  }
  {
    "id": "modal.labelConfirm.default",
    "defaultMessage": "Yes"
  },
  {
    "id": "modal.labelCancel.default",
    "defaultMessage": "Cancel"
  }
  {
    "id": "pageNotFound",
    "defaultMessage": "Page not found"
  }
  {
    "id": "permissions.viewNotPermitted",
    "defaultMessage": "You don't have a view permission"
  },
  {
    "id": "permissions.deleteNotPermitted",
    "defaultMessage": "You don't have a delete permission"
  },
  {
    "id": "permissions.addNotPermitted",
    "defaultMessage": "You don't have an add permission"
  },
  {
    "id": "permissions.saveNotPermitted",
    "defaultMessage": "You don't have a save permission"
  }
]
```

## Credits & Links
CRUDL is written and maintained by vonautomatisch (Patrick Kranzlmüller, Axel Swoboda).

* http://crudl.io
* https://twitter.com/crudlio
* http://vonautomatisch.at
