## [2.0.8] - 2020-04-12

### Improvement

- Updating dependencies
- Switching to circleci

## [2.0.7] 2020-04-11
  
### Fix

Fix npm package

## [2.0.6] 2020-02-08
  
### Improvement

Updating dependencies

## [2.0.4] 2019-11-24
  
### Fix

- Saving lists (@valentinvichnal)

## [2.0.3] 2019-11-04
  
### Refactor

- Uses typescript

## [2.0.2] 2019-07-23
  
### Feat

- Support V4 API

## [1.1.1] 2019-04-07

### Misc

- Updating dependencies, support latest mongo server

## [1.1.0] 2017-04-10

### Features

- `find` and `findOne` queries implemented by [kombuchafox](https://github.com/kombuchafox)

## [1.0.2] 2016-07-25

### Bug Fix

###### Storage connector stores high level arrays under __dsList ( records should only contain objects and not arrays on a highlevel )

## [1.0.1] 2016-07-13

### Bug Fix

###### Storage connector no longer mutates original object state

## [1.0.0] 2016-07-01

# Improvements
- RethinkDB package update to 2.3.1
- Data is a first class citizen

# Compatibility issues / Breaking Changes
- deepstream metadata is now stored within each record under `__ds` to improve querying. Updating to this version will require data to be migrated to new structure.

Now
```json
{
   "name": "John'",
   "age": "24",
   "__ds": {
     "_v": "10"
   }
}
```

Before:
```json
{
     "_v": "10",
   "_d": {
      "name": "John",
      "age": "24"
   }
}
```
