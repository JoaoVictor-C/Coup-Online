import { OverlayTrigger, Tooltip } from 'react-bootstrap';

const renderTooltip = (actionType: string) => (
  <Tooltip id={`tooltip-${actionType}`}>
    {getActionDetails(actionType).description}
  </Tooltip>
);

const renderCardImg = (actionType: string) => {
  switch(actionType) {
    case 'steal':
      return <img src={cardImages.captain} alt="Steal" />;
    // Handle other cases
    default:
      return null;
  }
};

{/* Inside the Modal Body */}
<Row>
  {['steal', 'assassinate', 'tax', 'exchange'].map((actionType) => (
    <Col md={3} className="mb-3" key={actionType}>
      <OverlayTrigger placement="top" overlay={renderTooltip(actionType)}>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Card
            onClick={() => handleActionClick({ actionType: actionType as Action['actionType'] })}
            className="h-100 text-center shadow-m border-0"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ width: 'auto', height: 'auto', margin: '0 auto' }}>
              {renderCardImg(actionType)}
            </div>
          </Card>
        </motion.div>
      </OverlayTrigger>
    </Col>
  ))}
</Row>
