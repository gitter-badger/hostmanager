URL to get new hostname for given domain
http://localhost:3000/getHostname?domain=booking.acetravels.com

Response example:
{
  "hostname": "host15.booking.acetravels.com"
}

URL to get list of all domains and count of hosts under the domain:
http://localhost:3000

Response example:

```json
[
	{
		"count": 15,
		"domain": "booking.acetravels.com",
		"_id": "521080a8acd9a7ec10000003",
		"__v": 0
	},
	{
		"count": 2,
		"domain": "holiday.acetravels.com",
		"_id": "521080c2acd9a7ec10000004",
		"__v": 0
	},
	{
		"count": 1,
		"domain": "logs.cloud.acetravels.com",
		"_id": "521080d0acd9a7ec10000005",
		"__v": 0
	}
]
```
