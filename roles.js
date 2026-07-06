export function hasRole(user, role){
  return user.roles?.admin || user.roles?.[role];
}

export function canAccess(user, allowedRoles){

  if(user.roles?.admin) return true;

  return allowedRoles.some(r => user.roles?.[r]);
}
