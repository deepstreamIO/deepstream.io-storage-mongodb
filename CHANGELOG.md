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
