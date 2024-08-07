import { Button, Card, Form } from "react-bootstrap";
import { VehicleState } from "../../models/VehicleState";

export const ControlPanel: React.FC<{
  vehicleStateList: VehicleState[],
  hideAllRoutes: any,
  showAllRoutes: any,
  fitAllOnScreen: any,
  toggleMapStyle: any
}> = (props) => {
  let activeCount = 0;
  props.vehicleStateList.forEach((vehicleState) => {
    if (!vehicleState.positionLimited) {
      ++activeCount;
    }
  })
  return (
    <Card style={{ width: '18rem', alignSelf: 'end'}}>
      <Card.Body>
        <Card.Title>Roadrunner Viewer</Card.Title>
        <Card.Text>Vehicles: {activeCount} active / {props.vehicleStateList.length} total</Card.Text>
        <Form>
          <Button onClick={props.hideAllRoutes} value="Hide All Routes">Hide All Routes</Button>
          <Button onClick={props.showAllRoutes} value="Show All Routes">Show All Routes</Button>
          <Button onClick={props.fitAllOnScreen} value="Fit All On Screen">Fit All On Screen</Button>
          <Button onClick={props.toggleMapStyle} value="Toggle Map Style">Toggle Map Style</Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
