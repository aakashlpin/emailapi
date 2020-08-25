import axios from 'axios';

async function handle(req, res) {
  const { apiId, serviceEndpoint, success, pending } = req.body;
  const { data: serviceData } = await axios(serviceEndpoint);
  const { data = [] } = serviceData;

  let updatedServiceData;
  const dataEntry = {
    _createdOn: new Date().toISOString(),
    id: apiId,
    is_pending: true,
  };

  if (pending) {
    updatedServiceData = [...data, dataEntry];
  } else {
    updatedServiceData = data.map((item) =>
      item.id === apiId
        ? {
            ...item,
            is_pending: false,
            is_successful: success,
            _isReadyOn: new Date().toISOString(),
          }
        : item,
    );
  }

  await axios.put(serviceEndpoint, {
    ...serviceData,
    data: updatedServiceData,
  });

  res.json({});
}

export default handle;
