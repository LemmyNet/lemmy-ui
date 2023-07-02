export default function (err: any) {
  return err
    .toString()
    .replace(new RegExp("[?&]auth=[^&#]*(#.*)?$"), "$1")
    .replace(new RegExp("([?&])auth=[^&]*&"), "$1");
}
