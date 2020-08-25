import axios from 'axios';

async function handle(req, res) {
  const { apiId, serviceEndpoint, success } = req.body;
  const { data: serviceData } = await axios(serviceEndpoint);
  const { data } = serviceData;

  const updatedServiceData = {
    ...serviceData,
    data: data.map((dataItem) =>
      dataItem.id === apiId
        ? {
            ...dataItem,
            is_pending: false,
            is_successful: success,
            _isReadyOn: new Date().toISOString(),
          }
        : dataItem,
    ),
  };

  await axios.put(serviceEndpoint, updatedServiceData);
  res.json({});
}

export default handle;
