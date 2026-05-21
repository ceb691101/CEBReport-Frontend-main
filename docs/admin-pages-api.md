# Admin Pages API Links and Examples

This document lists the admin pages in the frontend and the API endpoints they call.

## Base Paths

- `roleadminapi` is the main admin API namespace used by the admin pages.
- Most endpoints return an envelope like `{ data, errorMessage }`.

## Admin Home / Overview

Route: `/adminhome`

This page loads summary data for the admin dashboard.

### APIs used

- `GET /roleadminapi/api/roleinfo/admin`
- `GET /roleadminapi/api/roleinfo/user`
- `GET /roleadminapi/api/reportcategory`
- `GET /roleadminapi/api/reportentry`
- `GET /roleadminapi/api/reppara/GET_REPORTPARAMS`

### Example

```http
GET /roleadminapi/api/roleinfo/admin
```

Expected shape:

```json
{
  "data": [
    {
      "EpfNo": "12345",
      "RoleId": "R001",
      "RoleName": "Administrator",
      "UserType": "ADMIN"
    }
  ],
  "errorMessage": null
}
```

## User Roles

Route: `/adminhome?section=user-roles`

This page manages admin and user role assignments.

### APIs used

- `GET /roleadminapi/api/roleinfo/ADMIN`
- `GET /roleadminapi/api/roleinfo/admin`
- `GET /roleadminapi/api/roleinfo/USER`
- `GET /roleadminapi/api/roleinfo/user`
- `GET /roleadminapi/api/roleinfo/companies`
- `GET /roleadminapi/api/roleinfo/companies/{companyId}/costcentres`
- `GET /roleadminapi/api/roleinfo/companies/ALL/costcentres`
- `GET /roleadminapi/api/roleinfo/{epfNo}/{userType}/costcentres`
- `GET /roleadminapi/api/roleinfo/usergroups`
- `POST /roleadminapi/api/roleinfo`
- `PUT /roleadminapi/api/roleinfo/{epfNo}/{userType}`
- `DELETE /roleadminapi/api/roleinfo/{epfNo}/{userType}`

### Example: load company list

```http
GET /roleadminapi/api/roleinfo/companies
```

### Example: load cost centres for one company

```http
GET /roleadminapi/api/roleinfo/companies/EDL/costcentres
```

### Example: create a role

```http
POST /roleadminapi/api/roleinfo
Content-Type: application/json

{
  "epfNo": "12345",
  "roleId": "R001",
  "roleName": "Administrator",
  "company": "EDL",
  "motherCompany": "M1",
  "userGroup": "UG01",
  "costCentres": ["1001", "1002"],
  "userType": "ADMIN"
}
```

## Report Category

Route: `/adminhome?section=report-category`

This page manages report category records.

### APIs used

- `GET /roleadminapi/api/reportcategory`
- `POST /roleadminapi/api/reportcategory`
- `PUT /roleadminapi/api/reportcategory/{catCode}`
- `DELETE /roleadminapi/api/reportcategory/{catCode}`

### Example

```http
POST /roleadminapi/api/reportcategory
Content-Type: application/json

{
  "catCode": "FIN",
  "catName": "Finance"
}
```

## Report Entry

Route: `/adminhome?section=report-entry`

This page creates and maintains report entries.

### APIs used

- `GET /roleadminapi/api/reportentry/nextid`
- `GET /roleadminapi/api/reportcategory`
- `GET /roleadminapi/api/reportentry`
- `GET /roleadminapi/api/reportentry?catcode={catCode}`
- `GET /roleadminapi/api/reppara/GET_POPEDREPPARAMS`
- `POST /roleadminapi/api/reportentry`
- `PUT /roleadminapi/api/reportentry/{repIdNo}/{catCode}`
- `DELETE /roleadminapi/api/reportentry/{repIdNo}/{catCode}`

### Example: list reports in a category

```http
GET /roleadminapi/api/reportentry?catcode=FIN
```

### Example: create a report entry

```http
POST /roleadminapi/api/reportentry
Content-Type: application/json

{
  "repIdNo": 1001,
  "catCode": "FIN",
  "repName": "Monthly Finance Summary"
}
```

## Report Parameters

Route: `/adminhome?section=report-parameters`

This page loads, saves, populates, and deletes report parameters.

### APIs used

- `GET /roleadminapi/api/reppara/GET_REPORTPARAMS`
- `GET /roleadminapi/api/reppara/GET_POPEDREPPARAMS`
- `POST /roleadminapi/api/reppara/save-reportparams`
- `POST /roleadminapi/api/reppara/populate`
- `POST /roleadminapi/api/reppara/delete-reportparams`

### Example: populate parameters for a report

```http
POST /roleadminapi/api/reppara/populate
Content-Type: application/json

{
  "repIdNo": 1001,
  "paramValues": [
    "FROM_DATE=0",
    "TO_DATE=0"
  ]
}
```

## Role Report

Route: `/adminhome?section=role-report`

This page links roles to reports and allows assigning or removing reports for a selected user.

### APIs used

- `GET /roleadminapi/api/roleinfo/USER`
- `GET /roleadminapi/api/roleinfo/ADMIN`
- `GET /roleadminapi/api/reportcategory`
- `GET /roleadminapi/api/reportentry`
- `GET /roleadminapi/api/role-report/user/{roleId}/reports`
- `POST /roleadminapi/api/role-report/save-userrolereps`
- `DELETE /roleadminapi/api/role-report/user/{roleId}/reports`
- `DELETE /roleadminapi/api/role-report/user/{roleId}/reports/category/{catCode}`
- `DELETE /roleadminapi/api/role-report/user/{roleId}/reports/{repId}`

### Example: fetch a user's reports

```http
GET /roleadminapi/api/role-report/user/R001/reports
```

### Example: save role-report assignments

```http
POST /roleadminapi/api/role-report/save-userrolereps
Content-Type: application/json

{
  "roleId": "R001",
  "reports": [1001, 1002, 1003]
}
```

## Quick Reference

If you only need the most commonly used admin API links, start here:

- Roles: `GET /roleadminapi/api/roleinfo/admin`, `GET /roleadminapi/api/roleinfo/user`
- Role lookup: `GET /roleadminapi/api/roleinfo/ADMIN`, `GET /roleadminapi/api/roleinfo/USER`
- Companies: `GET /roleadminapi/api/roleinfo/companies`
- Report categories: `GET /roleadminapi/api/reportcategory`
- Report entries: `GET /roleadminapi/api/reportentry`
- Parameters: `GET /roleadminapi/api/reppara/GET_REPORTPARAMS`
- Role reports: `GET /roleadminapi/api/role-report/user/{roleId}/reports`
