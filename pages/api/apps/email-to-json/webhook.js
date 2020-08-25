import axios from 'axios';

async function handle(req, res) {
  const { apiId, serviceEndpoint, success } = req.body;
  const { data: serviceData } = await axios(serviceEndpoint);
  const { data = [] } = serviceData;

  const updatedServiceData = [
    ...data,
    {
      id: apiId,
      is_successful: success,
      _isReadyOn: new Date().toISOString(),
    },
  ];

  await axios.put(serviceEndpoint, {
    ...serviceData,
    data: updatedServiceData,
  });

  res.json({});
}

export default handle;
